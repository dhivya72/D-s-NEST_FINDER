import { useState } from "react";
import axios from "axios";

function UploadForm() {
  const [formData, setFormData] = useState({
    owner_name: "",
    contact: "",
    address: "",
    price: "",
    latitude: "",
    longitude: "",
    max_persons: "",
    house_type: "",
    is_booked: "0",
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviews((prev) => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    images.forEach((image) => data.append("images", image));
    Object.keys(formData).forEach((key) => data.append(key, formData[key]));

    try {
      const res = await axios.post("http://localhost:5000/add-house", data);
      alert(res.data);
      setFormData({
        owner_name: "",
        contact: "",
        address: "",
        price: "",
        latitude: "",
        longitude: "",
        max_persons: "",
        house_type: "",
        is_booked: "0",
      });
      setImages([]);
      setPreviews([]);
    } catch (error) {
      alert("Error uploading house");
      console.error(error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-4">Upload New House</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="owner_name"
          value={formData.owner_name}
          onChange={handleInputChange}
          placeholder="Owner Name"
          className="w-full p-2 mb-4 border rounded-lg"
          required
        />
        <input
          type="text"
          name="contact"
          value={formData.contact}
          onChange={handleInputChange}
          placeholder="Contact"
          className="w-full p-2 mb-4 border rounded-lg"
          required
        />
        <textarea
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          placeholder="Address"
          className="w-full p-2 mb-4 border rounded-lg"
          required
        />
        <input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleInputChange}
          placeholder="Price"
          className="w-full p-2 mb-4 border rounded-lg"
          required
        />
        <input
          type="number"
          name="max_persons"
          value={formData.max_persons}
          onChange={handleInputChange}
          placeholder="Maximum Persons"
          className="w-full p-2 mb-4 border rounded-lg"
          required
        />
        <select
          name="house_type"
          value={formData.house_type}
          onChange={handleInputChange}
          className="w-full p-2 mb-4 border rounded-lg"
          required
        >
          <option value="" disabled>
            Select House Type
          </option>
          <option value="1BHK">1BHK</option>
          <option value="2BHK">2BHK</option>
          <option value="3BHK">3BHK</option>
          <option value="Villa">Villa</option>
        </select>
        <input
          type="text"
          name="latitude"
          value={formData.latitude}
          onChange={handleInputChange}
          placeholder="Latitude"
          className="w-full p-2 mb-4 border rounded-lg"
          required
        />
        <input
          type="text"
          name="longitude"
          value={formData.longitude}
          onChange={handleInputChange}
          placeholder="Longitude"
          className="w-full p-2 mb-4 border rounded-lg"
          required
        />
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          className="w-full p-2 mb-4"
        />
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {previews.map((preview, i) => (
            <img
              key={i}
              src={preview}
              alt="Preview"
              className="h-24 rounded-lg shadow-md"
            />
          ))}
        </div>
        <button
          type="submit"
          className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-700"
        >
          Upload
        </button>
      </form>
    </div>
  );
}

export default UploadForm;
