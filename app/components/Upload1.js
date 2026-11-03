"use client";

import { useState } from "react";

const Upload = ({ onFilesUpload }) => {
  const [media, setMedia] = useState([]); // Array of uploaded file URLs
  const [loading, setLoading] = useState(false);

  const handleFilesChange = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    const uploadedMedia = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "ml_default");

      // Check if the file is a video
      const isVideo = file.type.startsWith("video/");
      if (!isVideo) continue; // Skip non-video files

      const uploadUrl = "https://api.cloudinary.com/v1_1/dtjcqfoxc/video/upload";

      try {
        const res = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          console.error(`Upload failed for ${file.name}`);
          continue;
        }

        const data = await res.json();
        uploadedMedia.push(data.secure_url);
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }

    setMedia((prevMedia) => [...prevMedia, ...uploadedMedia]);
    if (onFilesUpload) onFilesUpload(uploadedMedia);
    setLoading(false);
  };

  return (
    <div className="rd-field">
      <span className="rd-label">Upload videos</span>
      <input
        type="file"
        multiple
        accept="video/*" // Only allow video uploads
        onChange={handleFilesChange}
        className="rd-input"
      />
      {loading && <p className="rd-hint">Uploading…</p>}
      {media.length > 0 && (
        <div className="rd-thumbs">
          {media.map((fileUrl, index) => (
            <video key={index} controls className="rd-video">
              <source src={fileUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ))}
        </div>
      )}
    </div>
  );
};

export default Upload;
