import React, { useEffect, useState } from "react";
import supabase from "./supabase";
import Timeline from "./components/Timeline";
import "./index.css";

function App() {
    const [session, setSession] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => {
            listener?.subscription.unsubscribe();
        };
    }, []);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({ provider: "google" });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] flex flex-col relative overflow-x-hidden">
            <style>{`
                .fancy-heading { font-family: 'Orbitron', 'Segoe UI', Arial, sans-serif; letter-spacing: 2px; text-shadow: 0 2px 16px #00c6ff99, 0 1px 0 #232526; }
            `}</style>
            {/* Header with login/logout at top right */}
            <div className="w-full flex items-center justify-between px-8 pt-4 z-20">
                <h1 className="fancy-heading text-3xl font-extrabold text-blue-200 text-left">Historical Knowledge Explorer</h1>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {session?.user && (
                        <span className="text-blue-200 font-semibold drop-shadow text-sm">{session.user.email}</span>
                    )}
                    {session?.user ? (
                        <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-xl font-semibold shadow transition-all duration-200 border border-gray-600/60">Logout</button>
                    ) : (
                        <button onClick={handleLogin} className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition-all duration-300 glow">Login with Google</button>
                    )}
                </div>
            </div>
            {/* Main content centered below header */}
            <div className="flex flex-col items-center w-full max-w-5xl px-8 mx-auto mt-8 mb-4 z-10 min-h-0">
                <Timeline user={session?.user} accessToken={session?.access_token} />
            </div>
        </div>
    );
}

export default App;
