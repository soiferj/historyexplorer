import React, { useEffect, useState } from "react";
import supabase from "./supabase";
import Timeline from "./components/Timeline";
import MapView from "./components/MapView";
import "./index.css";

function App() {
    const [session, setSession] = useState(null);
    const [showMap, setShowMap] = useState(false);
    const [regionFilter, setRegionFilter] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => {
            if (listener && typeof listener.unsubscribe === "function") {
                listener.unsubscribe();
            }
        };
    }, []);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({ provider: "google" });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleRegionSelect = (region) => {
        setRegionFilter(region);
        setShowMap(false);
    };

    const clearRegionFilter = () => setRegionFilter(null);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] flex flex-col relative overflow-x-hidden">
            <style>{`
                .fancy-heading { font-family: 'Orbitron', 'Segoe UI', Arial, sans-serif; letter-spacing: 2px; text-shadow: 0 2px 16px #00c6ff99, 0 1px 0 #232526; }
            `}</style>
            {/* Header with login/logout at top right */}
            <div className="w-full flex flex-wrap items-center justify-between px-3 sm:px-8 pt-3 sm:pt-4 z-20 gap-2">
                <h1 className="fancy-heading text-xl sm:text-3xl font-extrabold text-blue-200 text-left whitespace-nowrap truncate max-w-[60vw]">History Explorer</h1>
                <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                    {session?.user && (
                        <span className="text-blue-200 font-semibold drop-shadow text-xs sm:text-sm truncate max-w-[40vw]">{session.user.email}</span>
                    )}
                    {session?.user ? (
                        <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 sm:px-4 rounded-xl font-semibold shadow transition-all duration-200 border border-gray-600/60 text-xs sm:text-base whitespace-nowrap">Logout</button>
                    ) : (
                        <button onClick={handleLogin} className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white px-3 py-2 sm:px-4 rounded-xl font-bold shadow-lg transition-all duration-300 glow text-xs sm:text-base whitespace-nowrap">Login with Google</button>
                    )}
                </div>
            </div>
            {/* Main content centered below header */}
            <div className="flex flex-col items-center w-full max-w-5xl px-8 mx-auto mt-2 mb-4 z-10 min-h-0">
                <div className="w-full flex justify-center mb-4 gap-4">
                    <button
                        className={`px-4 py-2 rounded font-bold shadow transition-all duration-200 border border-blue-400 text-white ${showMap ? 'bg-blue-700' : 'bg-gray-700 hover:bg-blue-700'}`}
                        onClick={() => { setShowMap(true); setRegionFilter(null); }}
                    >
                        World Map
                    </button>
                    <button
                        className={`px-4 py-2 rounded font-bold shadow transition-all duration-200 border border-blue-400 text-white ${!showMap ? 'bg-blue-700' : 'bg-gray-700 hover:bg-blue-700'}`}
                        onClick={() => setShowMap(false)}
                    >
                        Timeline
                    </button>
                    {regionFilter && (
                        <button
                            className="ml-2 px-3 py-2 rounded bg-pink-700 text-white font-bold border border-pink-300 shadow"
                            onClick={clearRegionFilter}
                        >
                            Clear Region Filter
                        </button>
                    )}
                </div>
                {showMap ? (
                    <MapView onRegionSelect={handleRegionSelect} />
                ) : (
                    <Timeline user={session?.user} accessToken={session?.access_token} regionFilter={regionFilter} />
                )}
            </div>
        </div>
    );
}

export default App;
