import { useState } from 'react';
import { Project } from '@/data/projectsData';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Card } from '@/components/ui/card';
interface ProjectGalleryProps {
  project: Project;
}
const ProjectGallery = ({
  project
}: ProjectGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Combine all project images into an array
  const images = [project.image, project.secondaryImage, ...(project.additionalImages || [])].filter(img => img && img !== project.image && img !== project.secondaryImage);

  // Add new image for UN RC Office project
  if (window.location.pathname.includes('united-nations-rc-office')) {
    // Replace the current active image with the new one
    images[activeIndex] = '/lovable-uploads/18307451-b9dd-4802-9af5-7d7b1ec0ec44.png';
  }
  const navigateGallery = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setActiveIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
    } else {
      setActiveIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
    }
  };
  if (!images.length) {
    return null;
  }
  return;
};
export default ProjectGallery;