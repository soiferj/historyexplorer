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
        <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] flex flex-col items-center justify-start relative overflow-x-hidden">
            <style>{`
                .fancy-heading { font-family: 'Orbitron', 'Segoe UI', Arial, sans-serif; letter-spacing: 2px; text-shadow: 0 2px 16px #00c6ff99, 0 1px 0 #232526; }
            `}</style>
            <h1 className="fancy-heading text-5xl font-extrabold mt-8 mb-2 z-10">Historical Knowledge Explorer</h1>
            <div className="flex justify-end w-full max-w-5xl px-8 mb-4 z-10 min-h-0">
                {session?.user ? (
                    <span className="mr-4 text-blue-200 font-semibold drop-shadow flex items-center">{session.user.email}</span>
                ) : null}
                {session?.user ? (
                    <button onClick={handleLogout} className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-5 py-2 rounded-xl font-bold shadow-lg transition-all duration-300 glow">Logout</button>
                ) : (
                    <button onClick={handleLogin} className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white px-5 py-2 rounded-xl font-bold shadow-lg transition-all duration-300 glow">Login with Google</button>
                )}
            </div>
            <Timeline user={session?.user} accessToken={session?.access_token} />
        </div>
    );
}

export default App;
