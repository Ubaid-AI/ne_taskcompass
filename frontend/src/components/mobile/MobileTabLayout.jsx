import { Outlet } from "react-router-dom";
import PhoneFrame from "./PhoneFrame.jsx";
import BottomNav from "./BottomNav.jsx";

export default function MobileTabLayout() {
  return (
    <PhoneFrame>
      {/* `relative` anchors the full screen panels a tab can push up, such as a
          doctor profile or a correction form, so they cover the content but stop
          short of the bottom navigation. */}
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        <Outlet />
      </div>
      <BottomNav />
    </PhoneFrame>
  );
}
