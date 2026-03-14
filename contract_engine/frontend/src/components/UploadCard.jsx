import { useCallback, useState } from "react";

export default function UploadCard({ onUploadSuccess }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) onUploadSuccess(file);
    },
    [onUploadSuccess],
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUploadSuccess(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
        dragging
          ? "border-brand-orange bg-orange-50"
          : "border-gray-300 bg-white hover:border-brand-orange"
      }`}
    >
      <svg
        className="mx-auto h-12 w-12 text-gray-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 48 48"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M24 8v24m-12-12h24M8 40h32"
        />
      </svg>
      <p className="text-gray-600 font-medium mb-2">
        Drag & drop your contract PDF here
      </p>
      <p className="text-gray-400 text-sm mb-4">or click to browse</p>
      <label className="inline-block px-6 py-2 bg-brand-orange text-white font-medium rounded-lg hover:bg-brand-orange-hover transition-colors cursor-pointer">
        Choose File
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
