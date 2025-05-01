
import { Link } from 'react-router-dom';

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
  image
}: ProjectCardProps) => {
  return (
    <Link 
      to={`/projects/${id}`} 
      className="block group"
    >
      {/* Project Image */}
      <div className="overflow-hidden rounded-sm mb-3">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105" 
        />
      </div>
      
      {/* Project Info */}
      <div className="text-left">
        <h3 className="text-neutral-900 font-medium mb-0.5">{title}</h3>
        <p className="text-sm text-neutral-600">{location}</p>
      </div>
    </Link>
  );
};

export default ProjectCard;
