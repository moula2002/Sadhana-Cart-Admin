import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  collection,
  query,
  orderBy,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";

function RatingsAndReviews() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 NEW STATES (IMAGE PREVIEW)
  const [showPreview, setShowPreview] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🔥 NEW STATES (DELETE POPUP)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const ratingRef = collection(db, "rating");
    const q = query(ratingRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ratingList = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));

        setRatings(ratingList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching ratings:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 🔥 OPEN DELETE MODAL
  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setShowDeleteModal(true);
  };

  // 🔥 CONFIRM DELETE
  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "rating", selectedId));
    } catch (error) {
      console.error("Error deleting review:", error);
    } finally {
      setShowDeleteModal(false);
      setSelectedId(null);
    }
  };

  // 🔥 OPEN PREVIEW
  const openPreview = (images, index) => {
    setPreviewImages(images);
    setCurrentIndex(index);
    setShowPreview(true);
  };

  // 🔥 NEXT IMAGE
  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % previewImages.length);
  };

  // 🔥 PREVIOUS IMAGE
  const prevImage = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? previewImages.length - 1 : prev - 1
    );
  };

  // 🔥 CLOSE
  const closePreview = () => {
    setShowPreview(false);
    setPreviewImages([]);
    setCurrentIndex(0);
  };

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading ratings...</div>;
  }

  return (
    <div style={{ padding: "20px", background: "#f5f7fa", minHeight: "100vh" }}>
      <h2 style={{ marginBottom: "20px" }}>⭐ Ratings & Reviews</h2>

      {ratings.length === 0 ? (
        <p>No ratings found</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {ratings.map((item) => {
            const allImages = [
              ...(item.image ? [item.image] : []),
              ...(item.images || []),
            ];

            return (
              <div
                key={item.id}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  padding: "15px",
                  position: "relative",
                }}
              >
                {/* DELETE BUTTON */}
                <button
                  onClick={() => handleDeleteClick(item.id)}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "5px 8px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Delete
                </button>

                {/* USER INFO */}
                <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                  <div
                    style={{
                      width: "35px",
                      height: "35px",
                      borderRadius: "50%",
                      background: "#4f46e5",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      marginRight: "10px",
                    }}
                  >
                    {item.userName ? item.userName.charAt(0).toUpperCase() : "U"}
                  </div>

                  <div>
                    <p style={{ margin: 0, fontWeight: "600" }}>
                      {item.userName || "Unknown User"}
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                      {item.userId}
                    </p>
                  </div>
                </div>

                {/* 🔥 IMAGES */}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    overflowX: "auto",
                    marginBottom: "10px",
                  }}
                >
                  {allImages.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt="review"
                      onClick={() => openPreview(allImages, index)}
                      style={{
                        width: "100px",
                        height: "100px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>

                <p style={{ fontSize: "13px", color: "#888" }}>
                  Product: {item.productid || item.productId}
                </p>

                <div style={{ margin: "8px 0" }}>
                  {"⭐".repeat(item.rating)}
                  {"☆".repeat(5 - item.rating)}
                </div>

                <p style={{ fontSize: "14px", marginBottom: "10px" }}>
                  {item.comment}
                </p>

                <p style={{ fontSize: "12px", color: "#999" }}>
                  {item.createdAt?.toDate
                    ? item.createdAt.toDate().toLocaleString()
                    : item.createdAt}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔥 DELETE POPUP */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "25px",
              borderRadius: "12px",
              width: "320px",
              textAlign: "center",
              boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
            }}
          >
            <h4 style={{ marginBottom: "15px" }}>Delete Review</h4>
            <p style={{ fontSize: "14px", marginBottom: "20px" }}>
              Are you sure you want to delete this review?
            </p>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: "#ccc",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 IMAGE PREVIEW MODAL (UNCHANGED) */}
      {showPreview && (
        <div
          onClick={closePreview}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <button onClick={(e) => { e.stopPropagation(); prevImage(); }} style={{ position: "absolute", left: "20px", color: "#fff", fontSize: "30px", background: "none", border: "none" }}>◀</button>

          <img src={previewImages[currentIndex]} alt="preview" style={{ maxWidth: "90%", maxHeight: "80%", borderRadius: "10px" }} />

          <button onClick={(e) => { e.stopPropagation(); nextImage(); }} style={{ position: "absolute", right: "20px", color: "#fff", fontSize: "30px", background: "none", border: "none" }}>▶</button>
        </div>
      )}
    </div>
  );
}

export default RatingsAndReviews;