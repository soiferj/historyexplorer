import React, { useState } from "react";
import useDebounce from '../hooks/useDebounce';

function FiltersPopover({
    searchTerms, setSearchTerms,
    searchLogic, setSearchLogic,
    dateFilter, setDateFilter,
    selectedTags, setSelectedTags,
    selectedBooks, setSelectedBooks,
    selectedRegions, setSelectedRegions,
    selectedCountries, setSelectedCountries,
    tagSearchTerm, setTagSearchTerm,
    bookSearchTerm, setBookSearchTerm,
    regionSearchTerm, setRegionSearchTerm,
    tagOverlapOnly, setTagOverlapOnly,
    allEvents,
    onClose,
    onDebouncedSearchTermsChange // <-- new prop for backend filter update
}) {
    // Helper to get all unique tags from allEvents
    function getAllTags(events) {
        const tagCount = {};
        const tagOriginal = {};
        (events || []).forEach(ev => Array.isArray(ev.tags) && ev.tags.forEach(tag => {
            const lower = tag.toLowerCase();
            tagCount[lower] = (tagCount[lower] || 0) + 1;
            if (!tagOriginal[lower]) tagOriginal[lower] = tag;
        }));
        return Object.entries(tagCount)
            .filter(([tag, count]) => count > 2)
            .map(([tag]) => tagOriginal[tag])
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }
    function getAllBooks(events) {
        const bookSet = new Set();
        (events || []).forEach(ev => ev.book_reference && bookSet.add(ev.book_reference));
        return Array.from(bookSet).sort((a, b) => a.localeCompare(b));
    }
    function getAllRegions(events) {
        const regionSet = new Set();
        (events || []).forEach(ev => Array.isArray(ev.regions) && ev.regions.forEach(region => regionSet.add(region)));
        return Array.from(regionSet).sort((a, b) => a.localeCompare(b));
    }
    function getAllCountries(events) {
        const countrySet = new Set();
        (events || []).forEach(ev => Array.isArray(ev.countries) && ev.countries.forEach(country => countrySet.add(country)));
        return Array.from(countrySet).sort((a, b) => a.localeCompare(b));
    }

    // Dropdown open/close state
    const [tagOpen, setTagOpen] = useState(false);
    const [bookOpen, setBookOpen] = useState(false);
    const [regionOpen, setRegionOpen] = useState(false);
    const [countryOpen, setCountryOpen] = useState(false);

    // --- Local state for country search term to avoid parent/global updates on every keystroke ---
    const [countrySearchTerm, setCountrySearchTerm] = useState("");
    const debouncedCountrySearchTerm = useDebounce(countrySearchTerm, 300);

    // --- Local state and debounce for tag, book, and region search terms ---
    const [tagSearch, setTagSearch] = useState(tagSearchTerm || "");
    const debouncedTagSearch = useDebounce(tagSearch, 300);
    React.useEffect(() => { setTagSearch(tagSearchTerm || ""); }, [tagSearchTerm]);
    React.useEffect(() => { if (debouncedTagSearch !== tagSearchTerm) setTagSearchTerm(debouncedTagSearch); }, [debouncedTagSearch]);

    const [bookSearch, setBookSearch] = useState(bookSearchTerm || "");
    const debouncedBookSearch = useDebounce(bookSearch, 300);
    React.useEffect(() => { setBookSearch(bookSearchTerm || ""); }, [bookSearchTerm]);
    React.useEffect(() => { if (debouncedBookSearch !== bookSearchTerm) setBookSearchTerm(debouncedBookSearch); }, [debouncedBookSearch]);

    const [regionSearch, setRegionSearch] = useState(regionSearchTerm || "");
    const debouncedRegionSearch = useDebounce(regionSearch, 300);
    React.useEffect(() => { setRegionSearch(regionSearchTerm || ""); }, [regionSearchTerm]);
    React.useEffect(() => { if (debouncedRegionSearch !== regionSearchTerm) setRegionSearchTerm(debouncedRegionSearch); }, [debouncedRegionSearch]);

    // --- Local state and debounce for year filters ---
    const [localStartYear, setLocalStartYear] = useState(dateFilter.startYear || "");
    const [localEndYear, setLocalEndYear] = useState(dateFilter.endYear || "");
    const debouncedStartYear = useDebounce(localStartYear, 300);
    const debouncedEndYear = useDebounce(localEndYear, 300);

    // Keep local year state in sync with parent/global (if needed)
    React.useEffect(() => { setLocalStartYear(dateFilter.startYear || ""); }, [dateFilter.startYear]);
    React.useEffect(() => { setLocalEndYear(dateFilter.endYear || ""); }, [dateFilter.endYear]);

    // Only update parent/global after debounce
    React.useEffect(() => {
        if (debouncedStartYear !== dateFilter.startYear) {
            setDateFilter(f => ({ ...f, startYear: debouncedStartYear }));
        }
    }, [debouncedStartYear]);
    React.useEffect(() => {
        if (debouncedEndYear !== dateFilter.endYear) {
            setDateFilter(f => ({ ...f, endYear: debouncedEndYear }));
        }
    }, [debouncedEndYear]);

    // Debounced search terms for performance
    const debouncedSearchTerms = useDebounce(searchTerms);
    React.useEffect(() => {
        if (onDebouncedSearchTermsChange) {
            onDebouncedSearchTermsChange(debouncedSearchTerms);
        }
    }, [debouncedSearchTerms, onDebouncedSearchTermsChange]);

    // Keep local state in sync with parent/global (if needed)
    React.useEffect(() => {
        setCountrySearchTerm(regionSearchTerm || "");
    }, [regionSearchTerm]);

    // Only update parent/global after debounce
    React.useEffect(() => {
        if (debouncedCountrySearchTerm !== regionSearchTerm) {
            setRegionSearchTerm(debouncedCountrySearchTerm);
        }
        // eslint-disable-next-line
    }, [debouncedCountrySearchTerm]);

    return (
        <div style={{ width: '100%', overflowY: 'auto', maxHeight: 'calc(70vh - 3rem)' }}>
            <h2 className="text-3xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-400 font-[Orbitron,sans-serif] tracking-tight text-center drop-shadow-lg">Filters</h2>
            {/* Multi Free Text Filters */}
            <div className="flex flex-col items-center w-full mb-4">
                <div className="flex flex-col gap-2 w-full items-center">
                    {searchTerms.map((term, idx) => (
                        <div key={idx} className="relative w-64 flex items-center mb-1">
                            <input
                                type="text"
                                placeholder={`Search anything...${searchTerms.length > 1 ? ` (${idx + 1})` : ''}`}
                                className="p-3 w-64 rounded-xl bg-gray-800/80 text-white text-center border border-blue-400 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all duration-300 shadow-md pr-10"
                                value={term}
                                onChange={e => setSearchTerms(terms => terms.map((t, i) => i === idx ? e.target.value : t))}
                            />
                            {term && (
                                <button
                                    type="button"
                                    className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-pink-400 focus:outline-none"
                                    onClick={() => setSearchTerms(terms => terms.map((t, i) => i === idx ? '' : t))}
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}
                            {searchTerms.length > 1 && (
                                <button
                                    type="button"
                                    className="absolute right-1 top-1/2 transform -translate-y-1/2 text-red-400 hover:text-pink-400 focus:outline-none text-lg"
                                    onClick={() => setSearchTerms(terms => terms.filter((_, i) => i !== idx))}
                                    aria-label="Remove search field"
                                >
                                    –
                                </button>
                            )}
                        </div>
                    ))}
                    <div className="flex gap-2 items-center mt-1">
                        <button
                            type="button"
                            className="px-2 py-1 rounded bg-blue-700 text-white text-xs border border-blue-400 hover:bg-blue-600"
                            onClick={() => setSearchTerms(terms => [...terms, ''])}
                        >
                            + Add Filter
                        </button>
                        <select
                            className="p-1 rounded bg-gray-800 text-white border border-blue-400 text-xs"
                            value={searchLogic}
                            onChange={e => setSearchLogic(e.target.value)}
                        >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                        </select>
                        <span className="text-blue-200 text-xs">Logic</span>
                    </div>
                </div>
            </div>
            {/* Date Range Filter */}
            <div className="mb-4 w-full flex flex-col items-center">
                <h3 className="text-lg font-semibold text-blue-200 mb-2">Date Filter</h3>
                <div className="flex flex-wrap justify-center gap-4 z-10">
                    <div className="flex items-center gap-2">
                        <label className="text-blue-200 font-semibold">From</label>
                        <input
                            type="number"
                            min="1"
                            max="9999"
                            value={localStartYear}
                            onChange={e => setLocalStartYear(e.target.value)}
                            placeholder="Year"
                            className="w-20 p-2 rounded bg-gray-800 text-white border border-blue-400"
                        />
                        <div className="flex gap-0 items-center mb-2">
                            <button
                                type="button"
                                className={`px-3 py-1 rounded-l-xl border font-semibold text-sm transition ${dateFilter.startEra === 'BCE' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-blue-200'} border-blue-400/40`}
                                onClick={() => setDateFilter(f => ({ ...f, startEra: 'BCE' }))}
                                aria-pressed={dateFilter.startEra === 'BCE'}
                                style={{ marginRight: '-1px', zIndex: dateFilter.startEra === 'BCE' ? 2 : 1 }}
                            >
                                BCE
                            </button>
                            <button
                                type="button"
                                className={`px-3 py-1 rounded-r-xl border font-semibold text-sm transition ${dateFilter.startEra === 'CE' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-pink-200'} border-pink-400/40`}
                                onClick={() => setDateFilter(f => ({ ...f, startEra: 'CE' }))}
                                aria-pressed={dateFilter.startEra === 'CE'}
                                style={{ marginLeft: '-1px', zIndex: dateFilter.startEra === 'CE' ? 2 : 1 }}
                            >
                                CE
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-blue-200 font-semibold">To</label>
                        <input
                            type="number"
                            min="1"
                            max="9999"
                            value={localEndYear}
                            onChange={e => setLocalEndYear(e.target.value)}
                            placeholder="Year"
                            className="w-20 p-2 rounded bg-gray-800 text-white border border-blue-400"
                        />
                        <div className="flex gap-0 items-center mb-2">
                            <button
                                type="button"
                                className={`px-3 py-1 rounded-l-xl border font-semibold text-sm transition ${dateFilter.endEra === 'BCE' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-blue-200'} border-blue-400/40`}
                                onClick={() => setDateFilter(f => ({ ...f, endEra: 'BCE' }))}
                                aria-pressed={dateFilter.endEra === 'BCE'}
                                style={{ marginRight: '-1px', zIndex: dateFilter.endEra === 'BCE' ? 2 : 1 }}
                            >
                                BCE
                            </button>
                            <button
                                type="button"
                                className={`px-3 py-1 rounded-r-xl border font-semibold text-sm transition ${dateFilter.endEra === 'CE' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-pink-200'} border-pink-400/40`}
                                onClick={() => setDateFilter(f => ({ ...f, endEra: 'CE' }))}
                                aria-pressed={dateFilter.endEra === 'CE'}
                                style={{ marginLeft: '-1px', zIndex: dateFilter.endEra === 'CE' ? 2 : 1 }}
                            >
                                CE
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Tag Filter */}
            <div className="mb-4 w-full flex flex-col items-center">
                <button type="button" className="w-full flex justify-between items-center cursor-pointer focus:outline-none" onClick={() => setTagOpen(o => !o)}>
                    <span className="flex-1 flex justify-between items-center px-2 py-2 bg-gray-800 rounded text-blue-200 font-semibold mb-1 border border-blue-400">
                        <span>Filter by Tag{selectedTags.length > 0 ? ` (${selectedTags.length} selected)` : ''}</span>
                        <span className="ml-2">{tagOpen ? '▲' : '▼'}</span>
                    </span>
                    {selectedTags.length > 0 && (
                        <button type="button" className="ml-2 px-2 py-1 rounded bg-gray-700 text-white text-xs border border-blue-400" onClick={e => { e.stopPropagation(); setSelectedTags([]); }}>Clear</button>
                    )}
                </button>
                {tagOpen && (
                    <>
                        <input
                            type="text"
                            placeholder="Search tags..."
                            className="p-2 rounded bg-gray-800 text-white border border-blue-400 text-xs sm:text-sm w-64 text-center mb-2"
                            value={tagSearch}
                            onChange={e => setTagSearch(e.target.value)}
                        />
                        <div className="w-full flex flex-wrap justify-center gap-2 mb-2">
                            {getAllTags(allEvents)
                                .filter(tag => tag.toLowerCase().includes(debouncedTagSearch.toLowerCase()))
                                .map((tag) => {
                                    const isSelected = selectedTags.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            className={`px-3 py-1 rounded-full text-white text-xs font-semibold shadow transition ${isSelected ? '' : 'hover:bg-pink-500'}`}
                                            style={{ background: isSelected ? '#2563eb' : '#374151', border: isSelected ? `2px solid #2563eb` : undefined }}
                                            onClick={e => { e.stopPropagation(); setSelectedTags(tags => tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]); }}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                        </div>
                    </>
                )}
            </div>
            {/* Country Filter */}
            <div className="mb-4 w-full flex flex-col items-center">
                <button type="button" className="w-full flex justify-between items-center cursor-pointer focus:outline-none" onClick={() => setCountryOpen(o => !o)}>
                    <span className="flex-1 flex justify-between items-center px-2 py-2 bg-gray-800 rounded text-blue-200 font-semibold mb-1 border border-blue-400">
                        <span>Filter by Country{selectedCountries.length > 0 ? ` (${selectedCountries.length} selected)` : ''}</span>
                        <span className="ml-2">{countryOpen ? '▲' : '▼'}</span>
                    </span>
                    {selectedCountries.length > 0 && (
                        <button type="button" className="ml-2 px-2 py-1 rounded bg-gray-700 text-white text-xs border border-blue-400" onClick={e => { e.stopPropagation(); setSelectedCountries([]); }}>Clear</button>
                    )}
                </button>
                {countryOpen && (
                    <>
                        <input
                            type="text"
                            placeholder="Search countries..."
                            className="p-2 rounded bg-gray-800 text-white border border-blue-400 text-xs sm:text-sm w-64 text-center mb-2"
                            value={countrySearchTerm}
                            onChange={e => setCountrySearchTerm(e.target.value)}
                        />
                        <div className="w-full flex flex-wrap justify-center gap-2 mb-2">
                            {getAllCountries(allEvents)
                                .filter(country => country.toLowerCase().includes(debouncedCountrySearchTerm.toLowerCase()))
                                .map((country) => {
                                    const isSelected = selectedCountries.includes(country);
                                    return (
                                        <button
                                            key={country}
                                            className={`px-3 py-1 rounded-full text-white text-xs font-semibold shadow transition ${isSelected ? '' : 'hover:bg-pink-500'}`}
                                            style={{ background: isSelected ? '#2563eb' : '#374151', border: isSelected ? `2px solid #2563eb` : undefined }}
                                            onClick={e => { e.stopPropagation(); setSelectedCountries(countries => countries.includes(country) ? countries.filter(c => c !== country) : [...countries, country]); }}
                                        >
                                            {country}
                                        </button>
                                    );
                                })}
                        </div>
                    </>
                )}
            </div>
            {/* Region Filter */}
            <div className="mb-4 w-full flex flex-col items-center">
                <button type="button" className="w-full flex justify-between items-center cursor-pointer focus:outline-none" onClick={() => setRegionOpen(o => !o)}>
                    <span className="flex-1 flex justify-between items-center px-2 py-2 bg-gray-800 rounded text-blue-200 font-semibold mb-1 border border-blue-400">
                        <span>Filter by Region{selectedRegions.length > 0 ? ` (${selectedRegions.length} selected)` : ''}</span>
                        <span className="ml-2">{regionOpen ? '▲' : '▼'}</span>
                    </span>
                    {selectedRegions.length > 0 && (
                        <button type="button" className="ml-2 px-2 py-1 rounded bg-gray-700 text-white text-xs border border-blue-400" onClick={e => { e.stopPropagation(); setSelectedRegions([]); }}>Clear</button>
                    )}
                </button>
                {regionOpen && (
                    <>
                        <input
                            type="text"
                            placeholder="Search regions..."
                            className="p-2 rounded bg-gray-800 text-white border border-blue-400 text-xs sm:text-sm w-64 text-center mb-2"
                            value={regionSearch}
                            onChange={e => setRegionSearch(e.target.value)}
                        />
                        <div className="w-full flex flex-wrap justify-center gap-2 mb-2">
                            {getAllRegions(allEvents)
                                .filter(region => region.toLowerCase().includes(debouncedRegionSearch.toLowerCase()))
                                .map((region) => {
                                    const isSelected = selectedRegions.includes(region);
                                    return (
                                        <button
                                            key={region}
                                            className={`px-3 py-1 rounded-full text-white text-xs font-semibold shadow transition ${isSelected ? '' : 'hover:bg-pink-500'}`}
                                            style={{ background: isSelected ? '#2563eb' : '#374151', border: isSelected ? `2px solid #2563eb` : undefined }}
                                            onClick={e => { e.stopPropagation(); setSelectedRegions(regions => regions.includes(region) ? regions.filter(r => r !== region) : [...regions, region]); }}
                                        >
                                            {region}
                                        </button>
                                    );
                                })}
                        </div>
                    </>
                )}
            </div>
            {/* Book Filter */}
            <div className="mb-4 w-full flex flex-col items-center">
                <button type="button" className="w-full flex justify-between items-center cursor-pointer focus:outline-none" onClick={() => setBookOpen(o => !o)}>
                    <span className="flex-1 flex justify-between items-center px-2 py-2 bg-gray-800 rounded text-blue-200 font-semibold mb-1 border border-blue-400">
                        <span>Filter by Book{selectedBooks.length > 0 ? ` (${selectedBooks.length} selected)` : ''}</span>
                        <span className="ml-2">{bookOpen ? '▲' : '▼'}</span>
                    </span>
                    {selectedBooks.length > 0 && (
                        <button type="button" className="ml-2 px-2 py-1 rounded bg-gray-700 text-white text-xs border border-blue-400" onClick={e => { e.stopPropagation(); setSelectedBooks([]); }}>Clear</button>
                    )}
                </button>
                {bookOpen && (
                    <>
                        <input
                            type="text"
                            placeholder="Search books..."
                            className="p-2 rounded bg-gray-800 text-white border border-blue-400 text-xs sm:text-sm w-64 text-center mb-2"
                            value={bookSearch}
                            onChange={e => setBookSearch(e.target.value)}
                        />
                        <div className="w-full flex flex-wrap justify-center gap-2 mb-2">
                            {getAllBooks(allEvents)
                                .filter(book => book.toLowerCase().includes(debouncedBookSearch.toLowerCase()))
                                .map((book) => {
                                    const isSelected = selectedBooks.includes(book);
                                    return (
                                        <button
                                            key={book}
                                            className={`px-3 py-1 rounded-full text-white text-xs font-semibold shadow transition ${isSelected ? '' : 'hover:bg-pink-500'}`}
                                            style={{ background: isSelected ? '#2563eb' : '#374151', border: isSelected ? `2px solid #2563eb` : undefined }}
                                            onClick={e => { e.stopPropagation(); setSelectedBooks(books => books.includes(book) ? books.filter(b => b !== book) : [...books, book]); }}
                                        >
                                            {book}
                                        </button>
                                    );
                                })}
                        </div>
                    </>
                )}
            </div>
            {/* Tag Overlap Only Toggle */}
            <div className="mb-4 w-full flex flex-col items-center">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={tagOverlapOnly}
                        onChange={e => setTagOverlapOnly(e.target.checked)}
                    />
                    <span className="text-blue-200">Show only events with intersecting filters</span>
                </label>
            </div>
            {/* Clear All Filters Button */}
            <button
                className="mt-8 px-6 py-2 rounded bg-gray-700 text-white border border-blue-400 hover:bg-blue-600 transition w-full"
                onClick={() => {
                    setDateFilter({ startYear: '', startEra: 'BCE', endYear: '', endEra: 'CE' });
                    setLocalStartYear('');
                    setLocalEndYear('');
                    setSearchTerms([""]);
                    setSelectedTags([]);
                    setSelectedBooks([]);
                    setSelectedRegions([]);
                    setSelectedCountries([]);
                    setTagSearchTerm('');
                    setBookSearchTerm('');
                    setRegionSearchTerm('');
                    setTagOverlapOnly(false);
                    setTagOpen(false);
                    setBookOpen(false);
                    setRegionOpen(false);
                    setCountryOpen(false);
                }}
                type="button"
            >
                Clear All Filters
            </button>
        </div>
    );
}

export default FiltersPopover;
