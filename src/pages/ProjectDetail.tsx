import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import projectsData, { Project } from '@/data/projectsData';
import ProjectHero from '@/components/project/ProjectHero';
import ProjectMetadata from '@/components/project/ProjectMetadata';
import ProjectOverview from '@/components/project/ProjectOverview';
import ProjectGallery from '@/components/project/ProjectGallery';
import ProjectNavigation from '@/components/project/ProjectNavigation';
import ProjectNotFound from '@/components/project/ProjectNotFound';

type ProjectId = keyof typeof projectsData;

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Simulate data loading
    setTimeout(() => {
      if (id && id in projectsData) {
        setProject(projectsData[id as ProjectId]);
      }
      setIsLoading(false);
    }, 300);
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!project) {
    return <ProjectNotFound />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <ProjectHero project={project} />

      {/* Project Details */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <ProjectMetadata project={project} />
          <ProjectOverview 
            description={project.description}
            images={id === 'un-drivers-washroom' ? [
              '/lovable-uploads/Screenshot 2025-05-01 153210.png',
              '/lovable-uploads/Screenshot 2025-05-01 153058.png',
              '/lovable-uploads/Screenshot 2025-05-01 153023.png',
            ] : id === 'unicef-rooftop-lounge' ? [
              '/lovable-uploads/8f4e2787-7f87-42de-ba85-efc31f8d9eae.png',
              '/lovable-uploads/365ff580-8bb9-48e2-ad90-144069bfad6d.png',
              '/lovable-uploads/69ee228e-2645-4900-ad10-280f93663bb4.png',
            ] : id === 'un-canteen' ? [
              '/lovable-uploads/wellawatta_Photo - 1.jpg',
              '/lovable-uploads/wellawatta_Photo - 10.jpg',
              '/lovable-uploads/wellawatta_Photo - 7.jpg',
            ] : id === 'united-nations-conference-hall' ? [
              '/lovable-uploads/Salon_render_Photo - 1.jpg',
              '/lovable-uploads/Salon_render_Photo - 2.jpg',
              '/lovable-uploads/Salon_render_Photo - 3.jpg',
            ] : id === 'unops-office' ? [
              '/lovable-uploads/WhatsApp Image 2025-04-12 at 16.30.08_0076a311.jpg',
              '/lovable-uploads/WhatsApp Image 2025-04-12 at 16.30.08_485e5b73.jpg',
              '/lovable-uploads/WhatsApp Image 2025-04-12 at 16.30.08_0f2d2426.jpg',
            ] : undefined}
          />
          <ProjectGallery project={project} />
          <ProjectNavigation />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProjectDetail;
