import React from "react";

const EventModal = ({
  selectedEvent,
  editMode,
  handleEditSubmit,
  handleEditChange,
  localEditForm,
  editError,
  editBookMode,
  setEditBookMode,
  newBook,
  setNewBook,
  getAllBooks,
  validEvents,
  regenDescriptionLoading,
  regenTagsLoading,
  regenRegionsLoading,
  regenCountriesLoading,
  handleDeleteEvent,
  startEditEvent,
  submitting,
  Spinner,
  isAllowed,
  setShowModal,
  showModal,
  ...rest
}) => {
  if (!selectedEvent || !showModal) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center" style={{ marginTop: '6rem' }}>
      {/* Modal overlay - allow click to close */}
      <div
        className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#181c24cc] via-[#00c6ff55] to-[#ff512f77] backdrop-blur-[2px]"
        onClick={setShowModal}
        style={{ cursor: 'pointer' }}
      />
      <div
        className="relative glass p-10 rounded-3xl shadow-2xl border-2 border-blue-400/60 w-full max-w-xl z-[10000] flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526ee] via-[#00c6ff22] to-[#ff512f22] backdrop-blur-xl text-center"
        style={{
          maxHeight: '70vh',
          overflow: 'hidden',
          margin: '1rem',
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()} // Prevent modal content click from closing
      >
        <button
          className="absolute top-4 right-4 text-3xl text-blue-200 hover:text-pink-400 focus:outline-none"
          onClick={setShowModal}
          aria-label="Close modal"
        >
          &times;
        </button>
        <div style={{ width: '100%', overflowY: 'auto', maxHeight: 'calc(70vh - 3rem)' }}>
          {editMode ? (
            <div style={{width: '100%', overflowY: 'auto', maxHeight: 'calc(70vh - 3rem)'}}>
              {/* ...form JSX and logic here, see Timeline.jsx for details... */}
              {/* You will need to pass all handlers and state as props from Timeline.jsx */}
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-blue-400 fancy-heading">{selectedEvent.title}</h2>
              <p className="text-blue-200 mb-2 text-lg">{new Date(selectedEvent.date).getFullYear()} {selectedEvent.date_type}</p>
              {selectedEvent.book_reference && (
                <p className="mt-2 text-pink-300">Book: {selectedEvent.book_reference}</p>
              )}
              <p className="text-gray-200 mb-4 whitespace-pre-line">{selectedEvent.description}</p>
              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <span className="bg-gradient-to-r from-blue-200 to-pink-200 px-3 py-1 rounded-full text-xs font-semibold text-blue-800 italic shadow">
                    <span className="italic font-normal text-gray-700 mr-1">Tags: </span>{selectedEvent.tags.join(", ")}
                  </span>
                </div>
              )}
              {selectedEvent.regions && selectedEvent.regions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <span className="bg-gradient-to-r from-blue-200 to-pink-200 px-3 py-1 rounded-full text-xs font-semibold text-blue-800 italic shadow">
                    <span className="italic font-normal text-gray-700 mr-1">Regions: </span>{selectedEvent.regions.join(", ")}
                  </span>
                </div>
              )}
              {selectedEvent.countries && selectedEvent.countries.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <span className="bg-gradient-to-r from-blue-200 to-pink-200 px-3 py-1 rounded-full text-xs font-semibold text-blue-800 italic shadow">
                    <span className="italic font-normal text-gray-700 mr-1">Countries: </span>{selectedEvent.countries.join(", ")}
                  </span>
                </div>
              )}
              {isAllowed && (
                <div className="flex flex-row gap-2 mt-6 justify-center opacity-70 hover:opacity-100 transition-opacity">
                  <button className="bg-gradient-to-r from-blue-500 to-pink-500 text-white px-4 py-2 rounded glow font-bold shadow transition-all duration-300" onClick={startEditEvent}>Edit</button>
                  <button className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded font-bold shadow hover:from-red-600 hover:to-pink-700 transition-all duration-300" onClick={handleDeleteEvent}>Delete</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;
