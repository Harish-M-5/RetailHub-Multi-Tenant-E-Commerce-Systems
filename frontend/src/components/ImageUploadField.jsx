import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { HiOutlineUpload, HiOutlineX } from "react-icons/hi";
import api from "../api/axios";

export default function ImageUploadField({ label, value, onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    try {
      const { data } = await api.post("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      {value ? (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
            title="Remove"
          >
            <HiOutlineX className="text-sm" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-xs rounded py-0.5"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-32 h-32 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:border-brand-500 hover:text-brand-500 transition-colors"
        >
          <HiOutlineUpload className="text-xl" />
          <span className="text-xs">{uploading ? "Uploading..." : "Upload"}</span>
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
