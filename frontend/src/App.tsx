import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Home from "@/pages/Home";
import Processing from "@/pages/Processing";
import Result from "@/pages/Result";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/processing/:jobId" element={<Processing />} />
            <Route path="/result/:jobId" element={<Result />} />
          </Routes>
        </main>

        {/* Ethics disclaimer */}
        <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-600">
          Usage responsable uniquement — contenu éducatif et créatif. Toute utilisation
          trompeuse ou malveillante est interdite.
        </footer>
      </div>
    </BrowserRouter>
  );
}
