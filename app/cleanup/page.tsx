"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

async function getPollData() {
  const response = await fetch('/api/polls/6fc94e30-05b2-4a44-bfdd-e0a7e375ea64/options');
  if (!response.ok) {
    return { options: [], uniqueTexts: 0 };
  }
  const { options } = await response.json();
  const uniqueTexts = new Set(options.map(o => o.text.trim().toLowerCase())).size;
  return { options, uniqueTexts };
}

export default function CleanupPage() {
  const [options, setOptions] = useState([]);
  const [uniqueTexts, setUniqueTexts] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getPollData().then(data => {
      setOptions(data.options);
      setUniqueTexts(data.uniqueTexts);
    });
  }, []);

  const handleCleanup = async () => {
    const response = await fetch('/api/polls/6fc94e30-05b2-4a44-bfdd-e0a7e375ea64/cleanup', {
      method: 'POST',
    });
    const result = await response.json();
    setMessage(result.message);
    getPollData().then(data => {
      setOptions(data.options);
      setUniqueTexts(data.uniqueTexts);
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Cleanup Poll Duplicates</h1>
      <p className="mb-4">Poll ID: 6fc94e30-05b2-4a44-bfdd-e0a7e375ea64</p>
      
      <div className="space-y-4 mb-6">
        <p>Current status:</p>
        <ul className="list-disc list-inside">
          <li>Total options: {options.length}</li>
          <li>Unique texts: {uniqueTexts}</li>
          <li>Duplicates to clean: {options.length - uniqueTexts}</li>
        </ul>
      </div>

      <form action={handleCleanup}>
        <Button type="submit" className="bg-red-600 hover:bg-red-700">
          Clean Up Duplicates
        </Button>
      </form>

      {message && <p className="mt-4">{message}</p>}

      <div className="mt-6">
        <a href="/debug" className="text-blue-600 hover:underline">
          View Debug Page
        </a>
      </div>
    </div>
  );
}
