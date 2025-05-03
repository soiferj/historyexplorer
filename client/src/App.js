import React, { useEffect, useState } from "react";
import supabase from "./supabase";
import Timeline from "./components/Timeline";

function App() {
    const [user, setUser] = useState(null);
    
    useEffect(() => {
        // Check for existing session
        const session = supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });
        // Listen for auth changes
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
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
        <div>
            <h1 className="text-4xl font-bold text-gray-800">
                Historical Knowledge Explorer
            </h1>
            <div className="flex justify-end m-4">
                {user ? (
                    <>
                        <span className="mr-4 text-gray-700">{user.email}</span>
                        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
                    </>
                ) : (
                    <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded">Login with Google</button>
                )}
            </div>
            <Timeline user={user} />
        </div>
    );
}

export default App;
