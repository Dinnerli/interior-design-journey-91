import { Project } from '@/data/projectsData';
import { Separator } from '@/components/ui/separator';
interface ProjectOverviewProps {
  description: string;
  images?: string[];
}
const ProjectOverview = ({
  description,
  images
}: ProjectOverviewProps) => {
  const defaultImages = [
    '/lovable-uploads/proj 2.1.png',
    '/lovable-uploads/proj 2.2.png',
    '/lovable-uploads/wmremove-transformed.png'
  ];
  const displayImages = images || defaultImages;
  return <div className="mb-16">
      <h2 className="text-2xl font-display font-medium mb-6">Project Overview</h2>
      <div className="section-divider mb-8"></div>
      <p className="text-lg leading-relaxed">{description}</p>
      <div className="flex flex-row justify-center gap-8 mt-10">
        {displayImages.map((img, idx) => (
          <img key={img} src={img} alt={`Project Square ${idx + 1}`} className="w-96 h-96 object-cover rounded-lg shadow" />
        ))}
      </div>
    </div>;
};
export default ProjectOverview;