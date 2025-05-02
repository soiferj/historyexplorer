import EventGraph from "./components/EventGraph";
import Timeline from "./components/Timeline";

function App() {
    return (
        <div>
            <h1 className="text-4xl font-bold text-gray-800">
                Historical Knowledge Explorer
            </h1>
            <p className="mt-2 text-lg text-gray-600">
                Dive into key moments from history.
            </p>
            <Timeline />
        </div>
    );
}

export default App;
