'use client';

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const ManageAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [formData, setFormData] = useState({
    country: '',
    city: '',
    dates: [], // array of { date, hours: [] }
  });

  const [currentDate, setCurrentDate] = useState({ date: null, hours: [] });
const [availableHours] = useState([
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'
]);

  const [isCountryCityDisabled, setIsCountryCityDisabled] = useState(false);

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/apoint');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Fetch failed:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const toggleHour = (hour) => {
    setCurrentDate((prev) => ({
      ...prev,
      hours: prev.hours.includes(hour)
        ? prev.hours.filter((h) => h !== hour)
        : [...prev.hours, hour],
    }));
  };

  const addDateEntry = () => {
    if (!formData.country || !formData.city || !currentDate.date || currentDate.hours.length === 0) {
      alert('Please fill out all required fields: country, city, date, and at least one hour.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      dates: [...prev.dates, { ...currentDate }],
    }));

    setCurrentDate({ date: null, hours: [] });
    setIsCountryCityDisabled(true); // Disable country and city after first date is added
  };

  const removeDateEntry = (index) => {
    const updatedDates = formData.dates.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      dates: updatedDates,
    }));

    // Enable country and city if no dates are left
    if (updatedDates.length === 0) {
      setIsCountryCityDisabled(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      country: formData.country,
      city: formData.city,
      dates: formData.dates.map((d) => ({
        date: d.date,
        hours: d.hours.map((h) => ({ hour: h, booked: false })),
      })),
    };

    try {
      const res = await fetch('/api/apoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ info: payload }),
      });

      if (res.ok) {
        setFormData({ country: '', city: '', dates: [] });
        setCurrentDate({ date: null, hours: [] });
        setIsCountryCityDisabled(false); // Re-enable country and city after submitting
        fetchAppointments();
      }
    } catch (err) {
      console.error('Submit failed:', err);
    }
  };

const handleDeleteAppointment = async (appointmentId, dateIndex) => {
  try {
    const res = await fetch(`/api/apoint?id=${appointmentId}&dateIndex=${dateIndex}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchAppointments();
    } else {
      alert('Failed to delete appointment date');
    }
  } catch (err) {
    console.error('Delete failed:', err);
  }
};


  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to 00:00 for today to ensure that only future dates can be selected.

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add Multiple Appointment Slots</h1>
      <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-md">
        <div>
          <label className="block mb-1">Country</label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className="border p-2 w-full"
            disabled={isCountryCityDisabled}
            required
          />
        </div>
        <div>
          <label className="block mb-1">City</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="border p-2 w-full"
            disabled={isCountryCityDisabled}
            required
          />
        </div>

        <div>
          <label className="block mb-1">Select Date</label>
          <DatePicker
            selected={currentDate.date}
            onChange={(date) => setCurrentDate({ ...currentDate, date })}
            dateFormat="dd/MM/yyyy"
            className="border p-2 w-full"
            minDate={today} // Prevent past dates
             
          />
        </div>

        <div>
          <label className="block mb-1">Select Hours for this date</label>
          <div className="flex flex-wrap gap-2">
            {availableHours.map((hour) => (
              <button
                key={hour}
                type="button"
                onClick={() => toggleHour(hour)}
                className={`px-3 py-1 rounded-md border ${
                  currentDate.hours.includes(hour) ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}
              >
                {hour}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={addDateEntry}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Add This Date
        </button>

        {formData.dates.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Dates to be submitted:</h3>
            {formData.dates.map((d, i) => (
              <div key={i} className="mb-2 border p-2 rounded bg-gray-50">
                <p>
                  <strong>{d.date.toLocaleDateString()}</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {d.hours.map((h, idx) => (
                    <span key={idx} className="bg-green-200 px-2 py-1 rounded">{h}</span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => removeDateEntry(i)}
                  className="text-red-500 mt-2"
                >
                  Remove this date
                </button>
              </div>
            ))}
          </div>
        )}

        {formData.dates.length > 0 && (
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            Submit Appointments
          </button>
        )}
      </form>

      <h2 className="text-xl font-bold mt-8">All Appointments</h2>
      <table className="w-full mt-4 border border-collapse border-gray-300">
        <thead>
          <tr>
            <th className="border p-2">Country</th>
            <th className="border p-2">City</th>
            <th className="border p-2">Date</th>
            <th className="border p-2">Hours</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointments.length > 0 ? (
            appointments
              .filter((item) => item.info && item.info.dates)
              .flatMap((item, index) =>
                item.info.dates.map((date, i) => (
                  <tr key={`${index}-${i}`}>
                    <td className="border p-2">{item.info.country}</td>
                    <td className="border p-2">{item.info.city}</td>
                    <td className="border p-2">{new Date(date.date).toLocaleDateString()}</td>
                    <td className="border p-2">
                      {date.hours.map((h, j) => (
                        <span
                          key={j}
                          className={`inline-block mr-2 px-2 py-1 rounded ${
                            h.booked ? 'bg-red-200' : 'bg-green-200'
                          }`}
                        >
                          {h.hour}
                        </span>
                      ))}
                    </td>
                    <td className="border p-2">
<button
  onClick={() => handleDeleteAppointment(item.id, i)}
  className="text-red-600"
>
  Delete
</button>

                    </td>
                  </tr>
                ))
              )
          ) : (
            <tr>
              <td colSpan="5" className="border p-2 text-center">
                No appointments found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ManageAppointments;
