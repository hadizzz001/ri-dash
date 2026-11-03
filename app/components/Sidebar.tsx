"use client";

import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutGrid,
  PlusSquare,
  Scissors,
  Database,
  FolderPlus,
  Puzzle,
  Video,
  Newspaper,
  Heading,
  Clock,
  ListChecks,
  Percent,
  Package,
  PackagePlus,
  Tags,
  Layers,
  Factory,
  Ticket,
  ShoppingBag,
  Star,
  Users,
  Image as ImageIcon,
  PanelTop,
  HardDriveDownload,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  /** A page was picked: the menu closes right away */
  onNavigate?: () => void;
}

const LOGO_URL =
  "https://res.cloudinary.com/dgi9mfldc/image/upload/v1766829842/black123_fbqmfb.webp";

type Item = { href: string; label: string; icon: any };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Appointments",
    items: [
      { href: "/reservation", label: "Calendar", icon: CalendarDays },
      { href: "/app1", label: "Booking Schedule", icon: Clock },
      { href: "/reservation", label: "View Appointments", icon: ListChecks },
      { href: "/tax", label: "Appointment Tax", icon: Percent },
    ],
  },
  {
    title: "Services",
    items: [
      { href: "/dashboard", label: "All Items", icon: LayoutGrid },
      { href: "/products", label: "Add Item", icon: PlusSquare },
      { href: "/service", label: "Add Service", icon: Scissors },
      { href: "/servicedata", label: "Services Data", icon: Database },
      { href: "/cat", label: "Add Category", icon: FolderPlus },
      { href: "/ext", label: "Add Extension", icon: Puzzle },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/vid", label: "Add Video", icon: Video },
      { href: "/new", label: "Add News", icon: Newspaper },
      { href: "/new1", label: "News Title", icon: Heading },
      { href: "/ads", label: "Ads Images", icon: ImageIcon },
      { href: "/aboutbanner", label: "About Banner", icon: PanelTop },
    ],
  },
  {
    title: "Shop",
    items: [
      { href: "/dashboard1", label: "All Products", icon: Package },
      { href: "/products1", label: "Add Product", icon: PackagePlus },
      { href: "/category", label: "Add Product Category", icon: Tags },
      { href: "/sub", label: "Add Sub-category", icon: Layers },
      { href: "/factory", label: "Add Brand", icon: Factory },
      { href: "/offer", label: "Add Code", icon: Ticket },
      { href: "/reservation1", label: "Orders", icon: ShoppingBag },
      { href: "/reviews", label: "Product Reviews", icon: Star },
      { href: "/users", label: "Customers", icon: Users },
    ],
  },
  {
    title: "System",
    items: [{ href: "/api/backup", label: "Backup", icon: HardDriveDownload }],
  },
];

/** Every menu link; page headers show the icon of their link (PageHeader.tsx). */
export const NAV_ITEMS: Item[] = GROUPS.flatMap((g) => g.items);

export default function Sidebar({ isOpen, toggleSidebar, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div id="sidenavv">
      {/* Backdrop on small screens */}
      {isOpen && <div className="rd-side-backdrop" onClick={toggleSidebar} />}

      <nav className={`rd-side ${isOpen ? "is-open" : ""}`} aria-label="Dashboard menu" aria-hidden={!isOpen}>
        <div className="rd-side__brand">
          <a href="/reservation" aria-label="Rafi Daham — dashboard">
            <img src={LOGO_URL} alt="Rafi Daham" />
          </a>
          <button type="button" className="rd-side__close" onClick={toggleSidebar} aria-label="Hide menu" title="Hide menu">
            <PanelLeftClose size={18} />
          </button>
        </div>

        <div className="rd-side__scroll">
          {GROUPS.map((g) => (
            <div className="rd-side__group" key={g.title}>
              <div className="rd-side__title">{g.title}</div>
              {g.items.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  onClick={onNavigate}
                  className={`rd-side__link ${pathname === href && label !== "View Appointments" ? "is-active" : ""}`}
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="rd-side__foot">
          <a href="/" className="rd-side__link rd-side__logout">
            <LogOut size={17} strokeWidth={1.8} />
            <span>Logout</span>
          </a>
        </div>
      </nav>

      {/* Floating "show menu" button while the sidebar is hidden */}
      <button
        type="button"
        className={`rd-side__open ${isOpen ? "is-hidden" : ""}`}
        onClick={toggleSidebar}
        aria-label="Show menu"
        title="Show menu"
      >
        <PanelLeftOpen size={18} />
      </button>
    </div>
  );
}
