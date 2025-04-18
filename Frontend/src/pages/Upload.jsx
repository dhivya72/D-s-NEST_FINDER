import UploadForm from "../components/UploadForm";

function Upload() {
  const userId = localStorage.getItem("userId");

  if (!userId) {
    window.location.href = "/login";
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <UploadForm />
    </div>
  );
}

export default Upload;
