import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Helper: get year from event (handles BCE/CE)
function getEventYear(event) {
  if (!event.date) return null;
  const year = parseInt(event.date.split("-")[0], 10);
  if (isNaN(year)) return null;
  return event.date_type === "BCE" ? -year : year;
}

// Helper: group events by period (e.g., decade, century)
function groupEventsByPeriod(events, period = "century") {
  const periodMap = {};
  events.forEach((event) => {
    const year = getEventYear(event);
    if (year === null) return;
    let periodLabel;
    if (period === "decade") {
      periodLabel = year < 0 ? `${Math.floor(year / 10) * 10}` : `${Math.floor(year / 10) * 10}`;
    } else {
      // Default: century
      const c = year < 0 ? Math.ceil(year / 100) : Math.floor(year / 100);
      periodLabel = year < 0 ? `${c * 100}` : `${(c + 1) * 100}`;
    }
    if (!periodMap[periodLabel]) periodMap[periodLabel] = [];
    periodMap[periodLabel].push(event);
  });
  return periodMap;
}

// Helper to get all unique tags from events, only include tags with more than 2 entries, sorted alphabetically (case-insensitive)
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

const COLORS = [
  "#36a2eb",
  "#ff6384",
  "#4bc0c0",
  "#ff9f40",
  "#9966ff",
  "#ffcd56",
  "#c9cbcf",
  "#2ecc40",
  "#e17055",
  "#00b894",
  "#fdcb6e",
  "#0984e3",
];

export default function TagEvolutionChart({ events, selectedTags, tagColors }) {
  const [period, setPeriod] = useState("century");
  // Only use tags present in filtered events and selected in filters
  const allTags = useMemo(() => selectedTags, [selectedTags]);

  // Compute tag frequencies per period
  const { labels, datasets } = useMemo(() => {
    const periodMap = groupEventsByPeriod(events, period);
    const sortedPeriods = Object.keys(periodMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map(String);
    const tagCounts = {};
    allTags.forEach((tag) => {
      tagCounts[tag] = sortedPeriods.map((p) =>
        periodMap[p]
          ? periodMap[p].filter((e) => Array.isArray(e.tags) && e.tags.includes(tag)).length
          : 0
      );
    });
    return {
      labels: sortedPeriods,
      datasets: allTags.map((tag, i) => ({
        label: tag,
        data: tagCounts[tag],
        borderColor: tagColors && tagColors[tag] ? tagColors[tag] : COLORS[i % COLORS.length],
        backgroundColor: (tagColors && tagColors[tag] ? tagColors[tag] : COLORS[i % COLORS.length]) + "33",
        tension: 0.3,
        fill: false,
      })),
    };
  }, [events, allTags, period, tagColors]);

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-xl font-bold mb-2 text-blue-200">Tag Evolution Over Time</h2>
      <div className="flex flex-row gap-2 mb-4 flex-wrap items-center">
        <label className="text-sm text-gray-200">Period:</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded px-2 py-1 bg-gray-800 text-white border border-blue-400"
        >
          <option value="century">Century</option>
          <option value="decade">Decade</option>
        </select>
        {/* Legend for tag colors */}
        <div className="flex flex-row gap-3 ml-6 items-center">
          {allTags.map((tag, i) => (
            <span key={tag} className="flex items-center gap-1 text-xs font-semibold" style={{ color: tagColors && tagColors[tag] ? tagColors[tag] : COLORS[i % COLORS.length] }}>
              <span style={{ background: tagColors && tagColors[tag] ? tagColors[tag] : COLORS[i % COLORS.length], width: 14, height: 14, borderRadius: 3, display: 'inline-block' }} />
              {tag}
            </span>
          ))}
        </div>
      </div>
      {/* Chart container with horizontal scroll on mobile and custom, auto-hiding thin scrollbar */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-300/10 scrollbar-hide">
        <div className="min-w-[700px] w-full max-w-full bg-gray-900 rounded-xl p-4 shadow-lg relative">
          {allTags.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-gray-900 bg-opacity-80 px-4 py-2 rounded text-center text-sm text-gray-300 font-medium shadow-lg">
                Select tags from the <i>Filters</i> to see their evolution over time
              </div>
            </div>
          )}
          <Line
            data={{ labels, datasets }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: {
                  mode: "index",
                  intersect: false,
                  callbacks: {
                    title: function(items) {
                      // Show year and BCE/CE in tooltip title
                      if (!items.length) return '';
                      const year = Number(items[0].label);
                      return year < 0 ? `${-year} BCE` : `${year} CE`;
                    },
                    labelColor: function(context) {
                      // Use the dataset's borderColor for the tooltip color box
                      const color = context.dataset.borderColor;
                      return {
                        borderColor: color,
                        backgroundColor: color,
                      };
                    },
                  }
                },
              },
              interaction: { mode: "nearest", axis: "x", intersect: false },
              scales: {
                y: {
                  beginAtZero: true,
                  title: { display: true, text: "Event Count" },
                  ticks: {
                    precision: 0,
                    stepSize: 1,
                    callback: function(value) {
                      return Number.isInteger(value) ? value : null;
                    }
                  }
                },
                x: {
                  title: { display: true, text: period === "century" ? "Century (Year)" : "Decade (Year)" },
                  ticks: {
                    callback: function(value, index, values) {
                      const year = Number(this.getLabelForValue(value));
                      return year < 0 ? `${-year} BCE` : `${year} CE`;
                    }
                  }
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
