// app/page.tsx
import ResumeBuilder from '../components/ResumeBuilder';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <ResumeBuilder />
    </div>
  );
}