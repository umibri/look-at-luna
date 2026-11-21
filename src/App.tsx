import Header from '@components/Header';
import MoonCalculator from '@components/MoonCalculator';
import MoonScene from '@components/Three/MoonScene';

export default function App() {
  return (
    <div className="bg-zinc-900">
      <Header />

      <div className="flex flex-col justify-center items-center">
        <MoonScene />
        <MoonCalculator />
      </div>
    </div>
  );
}
