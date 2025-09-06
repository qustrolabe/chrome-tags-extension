import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      Options WIP <br />
      <button
        onClick={() => setCount((count) => count + 1)}
        className="px-4 py-2 bg-neutral-500 text-white rounded hover:bg-neutral-600"
      >
        Count is {count}
      </button>
    </>
  );
}

export default App;
