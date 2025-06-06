import React, { useState } from "react";

const apiUrl = process.env.REACT_APP_API_URL;

const EventModal = ({
  selectedEvent,
  editMode,
  handleEditSubmit,
  handleEditChange,
  localEditForm,
  setLocalEditForm,
  editError,
  editBookMode,
  setEditBookMode,
  newBook,
  setNewBook,
  getAllBooks = () => [],
  getAllTags = () => [],
  getAllRegions = () => [],
  getAllCountries = () => [],
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
  // Add local mode state for tag/region/country add controls
  const [editTagMode, setEditTagMode] = useState('existing');
  const [editRegionMode, setEditRegionMode] = useState('existing');
  const [editCountryMode, setEditCountryMode] = useState('existing');
  const [newTagInput, setNewTagInput] = useState("");
  const [newRegionInput, setNewRegionInput] = useState("");
  const [newCountryInput, setNewCountryInput] = useState("");
  const [tagLoading, setTagLoading] = useState(false);
  const [regionLoading, setRegionLoading] = useState(false);
  const [countryLoading, setCountryLoading] = useState(false);
  const [tagError, setTagError] = useState("");
  const [regionError, setRegionError] = useState("");
  const [countryError, setCountryError] = useState("");

  // --- Confirm Delete Modal State ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Async add-new handlers for tag/region/country
  const handleAddNewTag = async () => {
    const val = newTagInput.trim();
    if (!val || localEditForm.tags.includes(val)) return;
    setTagLoading(true);
    setTagError("");
    try {
      const res = await fetch(`${apiUrl}/events/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: val })
      });
      if (!res.ok) throw new Error('Failed to add tag');
      setLocalEditForm(f => ({ ...f, tags: [...f.tags, val] }));
      setNewTagInput("");
      setEditTagMode('existing');
    } catch (err) {
      setTagError('Could not add tag.');
    } finally {
      setTagLoading(false);
    }
  };
  const handleAddNewRegion = async () => {
    const val = newRegionInput.trim();
    if (!val || localEditForm.regions.includes(val)) return;
    setRegionLoading(true);
    setRegionError("");
    try {
      const res = await fetch(`${apiUrl}/events/regions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region: val })
      });
      if (!res.ok) throw new Error('Failed to add region');
      setLocalEditForm(f => ({ ...f, regions: [...f.regions, val] }));
      setNewRegionInput("");
      setEditRegionMode('existing');
    } catch (err) {
      setRegionError('Could not add region.');
    } finally {
      setRegionLoading(false);
    }
  };
  const handleAddNewCountry = async () => {
    const val = newCountryInput.trim();
    if (!val || localEditForm.countries.includes(val)) return;
    setCountryLoading(true);
    setCountryError("");
    try {
      const res = await fetch(`${apiUrl}/events/countries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: val })
      });
      if (!res.ok) throw new Error('Failed to add country');
      setLocalEditForm(f => ({ ...f, countries: [...f.countries, val] }));
      setNewCountryInput("");
      setEditCountryMode('existing');
    } catch (err) {
      setCountryError('Could not add country.');
    } finally {
      setCountryLoading(false);
    }
  };

  if (!selectedEvent || !showModal) return null;

  // --- Confirm Delete Modal (matches Timeline.jsx style) ---
  const renderDeleteConfirmModal = () => (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center" style={{ alignItems: 'flex-start', marginTop: '6rem' }}>
      <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setShowDeleteConfirm(false)} />
      <div className="relative glass p-6 rounded-2xl shadow-2xl border border-red-400 w-full max-w-sm z-[10002] flex flex-col items-center animate-fade-in-modal bg-gradient-to-br from-[#232526cc] via-[#ff512f33] to-[#ff512f33] backdrop-blur-lg">
        <h3 className="text-lg font-bold mb-2 text-red-300">Confirm Delete</h3>
        <div className="mb-4 text-center text-red-200">
          Are you sure you want to delete this event?
          <div className="mt-2 mb-2 text-red-300 font-bold">{selectedEvent.title}</div>
        </div>
        {deleteError && <div className="text-red-400 mb-2">{deleteError}</div>}
        <div className="flex gap-4 mt-2">
          <button
            className="px-4 py-2 rounded bg-gray-600 text-white font-bold border border-gray-300 shadow"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={deleteLoading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-red-700 text-white font-bold hover:bg-red-800 border border-red-300 shadow disabled:opacity-60"
            disabled={deleteLoading}
            onClick={async () => {
              setDeleteLoading(true);
              setDeleteError("");
              try {
                await handleDeleteEvent();
                setShowDeleteConfirm(false);
                if (typeof setShowModal === 'function') setShowModal();
              } catch (err) {
                setDeleteError(err.message || 'Failed to delete event');
              } finally {
                setDeleteLoading(false);
              }
            }}
          >
            {deleteLoading ? "Deleting..." : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );

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
        {showDeleteConfirm && renderDeleteConfirmModal()}
        <div style={{ width: '100%', overflowY: 'auto', maxHeight: 'calc(70vh - 3rem)' }}>
          {editMode ? (
            localEditForm && typeof localEditForm === 'object' && Object.keys(localEditForm).length > 0 ? (
              <form onSubmit={handleEditSubmit} className="w-full flex flex-col gap-6 items-center">
                <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400 font-[Orbitron,sans-serif] tracking-tight text-center drop-shadow-lg">Edit Event</h2>
                {editError && <div className="text-red-400 mb-4 text-center w-full max-w-md mx-auto font-semibold">{editError}</div>}
                <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                  <label className="font-semibold text-blue-200" htmlFor="title">Title</label>
                  <input id="title" name="title" value={localEditForm.title} onChange={handleEditChange} required placeholder="Title" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" />
                </div>
                <div className="flex flex-row gap-4 w-full max-w-md mx-auto">
                  <div className="flex flex-col gap-2 text-left w-1/2">
                    <label className="font-semibold text-blue-200" htmlFor="year">Year</label>
                    <input id="year" name="year" value={localEditForm.year} onChange={handleEditChange} required placeholder="Year (e.g. 1776)" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400" maxLength={4} />
                  </div>
                  <div className="flex flex-col gap-2 text-left w-1/2">
                    <label className="font-semibold text-blue-200" htmlFor="date_type">Date Type</label>
                    <div className="flex gap-0 items-center mb-2">
                      <button
                        type="button"
                        className={`px-3 py-1 rounded-l-xl border font-semibold text-sm transition ${localEditForm.date_type === 'BCE' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-blue-200'} border-blue-400/40`}
                        onClick={() => handleEditChange({ target: { name: 'date_type', value: 'BCE' } })}
                        aria-pressed={localEditForm.date_type === 'BCE'}
                        style={{ marginRight: '-1px', zIndex: localEditForm.date_type === 'BCE' ? 2 : 1 }}
                      >
                        BCE
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1 rounded-r-xl border font-semibold text-sm transition ${localEditForm.date_type === 'CE' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-pink-200'} border-pink-400/40`}
                        onClick={() => handleEditChange({ target: { name: 'date_type', value: 'CE' } })}
                        aria-pressed={localEditForm.date_type === 'CE'}
                        style={{ marginLeft: '-1px', zIndex: localEditForm.date_type === 'CE' ? 2 : 1 }}
                      >
                        CE
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                  <label className="font-semibold text-blue-200" htmlFor="book_reference">Book</label>
                  <div className="flex gap-0 items-center mb-2">
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-l-xl border font-semibold text-sm transition ${editBookMode === 'existing' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-blue-200'} border-blue-400/40`}
                      onClick={() => setEditBookMode('existing')}
                      aria-pressed={editBookMode === 'existing'}
                      style={{ marginRight: '-1px', zIndex: editBookMode === 'existing' ? 2 : 1 }}
                    >
                      Existing Book
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-r-xl border font-semibold text-sm transition ${editBookMode === 'new' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-pink-200'} border-pink-400/40`}
                      onClick={() => setEditBookMode('new')}
                      aria-pressed={editBookMode === 'new'}
                      style={{ marginLeft: '-1px', zIndex: editBookMode === 'new' ? 2 : 1 }}
                    >
                      New Book
                    </button>
                  </div>
                  {editBookMode === 'existing' ? (
                    <select
                      id="book_reference_select"
                      className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-base border border-blue-400/40 shadow-inner"
                      value={localEditForm.book_reference || ''}
                      onChange={e => handleEditChange({ target: { name: 'book_reference', value: e.target.value } })}
                    >
                      <option value="">None</option>
                      {getAllBooks && getAllBooks(validEvents).map(book => (
                        <option key={book} value={book}>{book}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="book_reference"
                      name="book_reference"
                      value={localEditForm.book_reference}
                      onChange={handleEditChange}
                      placeholder="Type new book"
                      className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-pink-400 transition text-base border border-pink-400/40 shadow-inner placeholder:text-gray-400"
                      required
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                  <label className="font-semibold text-blue-200" htmlFor="description">Description</label>
                  <textarea id="description" name="description" value={localEditForm.description} onChange={handleEditChange} required placeholder="Description" className="p-3 rounded-xl bg-gray-800/80 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-base border border-blue-400/40 shadow-inner placeholder:text-gray-400 min-h-[80px]" />
                </div>
                <div className="flex flex-col gap-2 text-left w-full max-w-md mx-auto">
                  <label className="font-semibold text-blue-200" htmlFor="tags">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {Array.isArray(localEditForm.tags) && localEditForm.tags.map((tag, idx) => (
                      <span key={tag} className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        {tag}
                        <button type="button" className="ml-1 text-pink-200 hover:text-white" onClick={() => setLocalEditForm(f => ({ ...f, tags: f.tags.filter((t, i) => i !== idx) }))}>&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-row mb-2">
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-l-xl border font-semibold text-xs transition ${editTagMode === 'existing' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-blue-200'} border-blue-400/40`}
                      onClick={() => setEditTagMode('existing')}
                      aria-pressed={editTagMode === 'existing'}
                      style={{ marginRight: 0, zIndex: editTagMode === 'existing' ? 2 : 1 }}
                    >
                      Existing
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-r-xl border font-semibold text-xs transition ${editTagMode === 'new' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-pink-200'} border-pink-400/40`}
                      onClick={() => setEditTagMode('new')}
                      aria-pressed={editTagMode === 'new'}
                      style={{ marginLeft: 0, zIndex: editTagMode === 'new' ? 2 : 1 }}
                    >
                      New
                    </button>
                  </div>
                  {editTagMode === 'existing' ? (
                    <select
                      className="p-2 rounded-xl bg-gray-800 text-white border border-blue-400/40 focus:ring-2 focus:ring-blue-400 transition text-sm shadow-inner w-full max-w-xs"
                      onChange={e => {
                        const val = e.target.value;
                        if (val && !localEditForm.tags.includes(val)) setLocalEditForm(f => ({ ...f, tags: [...f.tags, val] }));
                        e.target.selectedIndex = 0;
                      }}
                    >
                      <option value="">Add existing tag...</option>
                      {getAllTags(validEvents).filter(tag => !localEditForm.tags.includes(tag)).map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex flex-row w-full max-w-xs">
                      <input
                        type="text"
                        value={newTagInput}
                        placeholder="Add new tag"
                        className="p-2 rounded-l-xl bg-gray-800 text-white border border-blue-400/40 focus:ring-2 focus:ring-pink-400 transition text-sm shadow-inner flex-1 min-w-0"
                        onChange={e => setNewTagInput(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter' && newTagInput.trim() && !tagLoading) {
                            await handleAddNewTag();
                          }
                        }}
                        disabled={tagLoading}
                      />
                      <button
                        type="button"
                        className="px-3 py-1 rounded-r-xl bg-blue-600 text-white font-bold border border-blue-400/40 hover:bg-blue-700 transition"
                        onClick={handleAddNewTag}
                        aria-label="Add tag"
                        disabled={tagLoading}
                      >
                        {tagLoading ? '...' : '+'}
                      </button>
                    </div>
                  )}
                  {tagError && <div className="text-red-400 text-xs mt-1">{tagError}</div>}
                </div>
                <div className="flex flex-row gap-4 w-full max-w-md mx-auto">
                  <div className="flex flex-col gap-2 text-left w-1/2">
                    <label className="font-semibold text-blue-200" htmlFor="regions">Regions</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {Array.isArray(localEditForm.regions) && localEditForm.regions.map((region, idx) => (
                        <span key={region} className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          {region}
                          <button type="button" className="ml-1 text-pink-200 hover:text-white" onClick={() => setLocalEditForm(f => ({ ...f, regions: f.regions.filter((r, i) => i !== idx) }))}>&times;</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-row mb-2">
                      <button
                        type="button"
                        className={`px-3 py-1 rounded-l-xl border font-semibold text-xs transition ${editRegionMode === 'existing' ? 'bg-green-600 text-white' : 'bg-gray-700 text-green-200'} border-green-400/40`}
                        onClick={() => setEditRegionMode('existing')}
                        aria-pressed={editRegionMode === 'existing'}
                        style={{ marginRight: 0, zIndex: editRegionMode === 'existing' ? 2 : 1 }}
                      >
                        Existing
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1 rounded-r-xl border font-semibold text-xs transition ${editRegionMode === 'new' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-pink-200'} border-pink-400/40`}
                        onClick={() => setEditRegionMode('new')}
                        aria-pressed={editRegionMode === 'new'}
                        style={{ marginLeft: 0, zIndex: editRegionMode === 'new' ? 2 : 1 }}
                      >
                        New
                      </button>
                    </div>
                    {editRegionMode === 'existing' ? (
                      <select
                        className="p-2 rounded-xl bg-gray-800 text-white border border-green-400/40 focus:ring-2 focus:ring-green-400 transition text-sm shadow-inner w-full max-w-xs"
                        onChange={e => {
                          const val = e.target.value;
                          if (val && !localEditForm.regions.includes(val)) setLocalEditForm(f => ({ ...f, regions: [...f.regions, val] }));
                          e.target.selectedIndex = 0;
                        }}
                      >
                        <option value="">Add existing region...</option>
                        {getAllRegions(validEvents).filter(region => !localEditForm.regions.includes(region)).map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex flex-row w-full max-w-xs">
                        <input
                          type="text"
                          value={newRegionInput}
                          placeholder="Add new region"
                          className="p-2 rounded-l-xl bg-gray-800 text-white border border-green-400/40 focus:ring-2 focus:ring-pink-400 transition text-sm shadow-inner flex-1 min-w-0"
                          onChange={e => setNewRegionInput(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && newRegionInput.trim() && !regionLoading) {
                              await handleAddNewRegion();
                            }
                          }}
                          disabled={regionLoading}
                        />
                        <button
                          type="button"
                          className="px-3 py-1 rounded-r-xl bg-green-600 text-white font-bold border border-green-400/40 hover:bg-green-700 transition"
                          onClick={handleAddNewRegion}
                          aria-label="Add region"
                          disabled={regionLoading}
                        >
                          {regionLoading ? '...' : '+'}
                        </button>
                      </div>
                    )}
                    {regionError && <div className="text-red-400 text-xs mt-1">{regionError}</div>}
                  </div>
                  <div className="flex flex-col gap-2 text-left w-1/2">
                    <label className="font-semibold text-blue-200" htmlFor="countries">Countries</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {Array.isArray(localEditForm.countries) && localEditForm.countries.map((country, idx) => (
                        <span key={country} className="bg-yellow-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          {country}
                          <button type="button" className="ml-1 text-pink-200 hover:text-white" onClick={() => setLocalEditForm(f => ({ ...f, countries: f.countries.filter((c, i) => i !== idx) }))}>&times;</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-row mb-2">
                      <button
                        type="button"
                        className={`px-3 py-1 rounded-l-xl border font-semibold text-xs transition ${editCountryMode === 'existing' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-yellow-200'} border-yellow-400/40`}
                        onClick={() => setEditCountryMode('existing')}
                        aria-pressed={editCountryMode === 'existing'}
                        style={{ marginRight: 0, zIndex: editCountryMode === 'existing' ? 2 : 1 }}
                      >
                        Existing
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1 rounded-r-xl border font-semibold text-xs transition ${editCountryMode === 'new' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-pink-200'} border-pink-400/40`}
                        onClick={() => setEditCountryMode('new')}
                        aria-pressed={editCountryMode === 'new'}
                        style={{ marginLeft: 0, zIndex: editCountryMode === 'new' ? 2 : 1 }}
                      >
                        New
                      </button>
                    </div>
                    {editCountryMode === 'existing' ? (
                      <select
                        className="p-2 rounded-xl bg-gray-800 text-white border border-yellow-400/40 focus:ring-2 focus:ring-yellow-400 transition text-sm shadow-inner w-full max-w-xs"
                        onChange={e => {
                          const val = e.target.value;
                          if (val && !localEditForm.countries.includes(val)) setLocalEditForm(f => ({ ...f, countries: [...f.countries, val] }));
                          e.target.selectedIndex = 0;
                        }}
                      >
                        <option value="">Add existing country...</option>
                        {getAllCountries(validEvents).filter(country => !localEditForm.countries.includes(country)).map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex flex-row w-full max-w-xs">
                        <input
                          type="text"
                          value={newCountryInput}
                          placeholder="Add new country"
                          className="p-2 rounded-l-xl bg-gray-800 text-white border border-yellow-400/40 focus:ring-2 focus:ring-pink-400 transition text-sm shadow-inner flex-1 min-w-0"
                          onChange={e => setNewCountryInput(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && newCountryInput.trim() && !countryLoading) {
                              await handleAddNewCountry();
                            }
                          }}
                          disabled={countryLoading}
                        />
                        <button
                          type="button"
                          className="px-3 py-1 rounded-r-xl bg-yellow-600 text-white font-bold border border-yellow-400/40 hover:bg-yellow-700 transition"
                          onClick={handleAddNewCountry}
                          aria-label="Add country"
                          disabled={countryLoading}
                        >
                          {countryLoading ? '...' : '+'}
                        </button>
                      </div>
                    )}
                    {countryError && <div className="text-red-400 text-xs mt-1">{countryError}</div>}
                  </div>
                </div>
                <div className="flex flex-row gap-4 mt-6 justify-center">
                  <button type="submit" className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 p-3 rounded-xl font-bold text-white shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed glow text-base min-w-[120px] tracking-wide" disabled={submitting}>
                    {submitting && Spinner ? <><Spinner /> Saving...</> : "Save Changes"}
                  </button>
                  <button type="button" className="bg-gray-700 hover:bg-gray-800 p-3 rounded-xl font-bold text-white shadow-xl transition-all duration-200 border border-gray-600/60 min-w-[120px]" onClick={() => { if (typeof setShowModal === 'function') setShowModal(); }}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-red-400 font-bold text-center">Loading...</div>
            )
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
                  <button className="bg-gradient-to-r from-blue-500 to-pink-500 text-white px-4 py-2 rounded glow font-bold shadow transition-all duration-300" onClick={() => { startEditEvent(); }}>Edit</button>
                  <button className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded font-bold shadow hover:from-red-600 hover:to-pink-700 transition-all duration-300" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
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
