
import { Separator } from '@/components/ui/separator';
import { AspectRatio } from '@/components/ui/aspect-ratio';

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

  return (
    <div className="mb-16">
      <h2 className="text-2xl font-display font-medium mb-6">Project Overview</h2>
      <div className="section-divider mb-8"></div>
      <p className="text-lg leading-relaxed mb-10">{description}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mt-6">
        {displayImages.slice(0, 3).map((img, idx) => (
          <div key={idx} className="overflow-hidden rounded-lg shadow hover:shadow-lg transition-shadow duration-300">
            <AspectRatio ratio={1}>
              <img 
                src={img} 
                alt={`Project Image ${idx + 1}`} 
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
              />
            </AspectRatio>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectOverview;
