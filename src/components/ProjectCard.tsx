import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
interface ProjectCardProps {
  id: string;
  title: string;
  location: string;
  image: string;
  type: string;
  client?: string;
  index: number;
}
const ProjectCard = ({
  id,
  title,
  location,
  image,
  type,
  client,
  index
}: ProjectCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  // Use the project image or fallback to the shared background image
  const backgroundImage = image || "/lovable-uploads/18307451-b9dd-4802-9af5-7d7b1ec0ec44.png";
  return <Link to={`/projects/${id}`} className="project-card group relative block h-[400px] overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:shadow-xl" style={{
    animationDelay: `${index * 0.1}s`
  }}>
      {/* Image with blur-up loading */}
      <div className="absolute inset-0 bg-gray-200 animate-pulse">
        <img src={backgroundImage} alt={title} className={`w-full h-full object-cover transition-all duration-700 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`} onLoad={() => setIsLoaded(true)} />
      </div>

      {/* Fixed background image overlay */}
      <div className="absolute inset-0 bg-black/30">
        <img alt="Interior background" className="w-full h-full object-cover opacity-40 mix-blend-overlay" src="/lovable-uploads/ed108008-0c7a-4630-bf29-b2a8c7c18641.png" />
      </div>

      {/* Gradient overlay for better text readability */}
      

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10 bg-transparent">
        <span className="inline-block px-3 py-1 text-xs tracking-wider uppercase bg-primary/80 rounded-full mb-3">
          {type}
        </span>
        
        {client && <div className="text-sm text-white/90 mb-1">{client}</div>}
        
        <h3 className="text-2xl font-display font-medium mb-1">{title}</h3>
        <p className="text-white/80 mb-4">{location}</p>
        
        <div className="flex items-center font-medium text-primary-foreground opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          <span>View Project</span>
          <ArrowRight size={16} className="ml-2" />
        </div>
      </div>

      {/* Hover overlay with enhanced effect */}
      
    </Link>;
};
export default ProjectCard;