
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious
} from './ui/carousel';
import { ScrollArea } from './ui/scroll-area';

interface FeaturedProjectProps {
  id: string;
  title: string;
  description: string;
  image: string;
  onPrevious?: () => void;
  onNext?: () => void;
  showPrevious?: boolean;
  showNext?: boolean;
}

const FeaturedProject = ({
  id,
  title,
  description,
  image,
  onPrevious,
  onNext,
  showPrevious = true,
  showNext = true
}: FeaturedProjectProps) => {
  // Add placeholder images for the Modern Tranquility project
  const projectImages = [
    '/lovable-uploads/eff774de-6686-4aad-848e-2d602d00903c.png',
    '/lovable-uploads/f096f045-ff14-4dcc-aa51-1bacdad217ae.png',
    '/lovable-uploads/5f328dd4-7501-49fb-87bb-befb4f4475f2.png',
    '/lovable-uploads/9e926f45-bc17-4f15-b5d9-40b7033f1399.png',
  ];

  return (
    <div className="relative w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
          <img src="/lovable-uploads/Screenshot 2025-04-28 220924.png" alt={title} className="w-full h-full object-cover transition-all duration-500 hover:scale-105" loading="eager" />
        </div>
        <div className="space-y-6">
          <h3 className="font-display text-5xl font-light py-0 my-[47px]">{title}</h3>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {description}
          </p>
          <div className="flex items-center gap-4">
            <Link to={`/projects/${id}`} className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors duration-300">
              View Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Project Carousel Gallery */}
      <div className="mt-12">
        <Carousel className="w-full">
          <CarouselContent className="-ml-2 md:-ml-4">
            {projectImages.map((img, index) => (
              <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
                  <img 
                    src={img} 
                    alt={`Project image ${index + 1}`} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex items-center justify-end gap-2 mt-4">
            <CarouselPrevious className="relative -left-0" />
            <CarouselNext className="relative -right-0" />
          </div>
        </Carousel>
      </div>

      {/* Small Project Gallery (static, kept for compatibility) */}
      <div className="mt-8 hidden">
        <div className="grid grid-cols-3 gap-4">
          <div className="aspect-[16/9] rounded-lg overflow-hidden">
            <img alt={`${title} detail 1`} className="w-full h-full object-cover transition-all duration-500 hover:scale-105" src="/lovable-uploads/8f4e2787-7f87-42de-ba85-efc31f8d9eae.png" />
          </div>
          <div className="aspect-[16/9] rounded-lg overflow-hidden">
            <img src="/lovable-uploads/69ee228e-2645-4900-ad10-280f93663bb4.png" alt={`${title} detail 2`} className="w-full h-full object-cover transition-all duration-500 hover:scale-105" />
          </div>
          <div className="aspect-[16/9] rounded-lg overflow-hidden">
            <img src="/lovable-uploads/365ff580-8bb9-48e2-ad90-144069bfad6d.png" alt={`${title} detail 3`} className="w-full h-full object-cover transition-all duration-500 hover:scale-105" />
          </div>
        </div>
      </div>

      {/* Project Text for Modern Tranquility */}
      {id === "modern-tranquility" && (
        <div className="mt-8">
          <ScrollArea className="h-[200px] rounded-md border p-6">
            <h4 className="text-2xl font-display font-medium mb-4">Modern Tranquility</h4>
            <p className="text-muted-foreground">
              Once an old factory, this Pelawatta residence has been transformed into a serene, modern haven. 
              The renovation embraces natural light and greenery, seamlessly blending indoor and outdoor spaces. 
              With minimalist design and neutral tones, this home now offers a peaceful retreat, combining its 
              industrial past with modern elegance.
            </p>
          </ScrollArea>
        </div>
      )}

      {/* Navigation Arrows */}
      <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between pointer-events-none">
        <Button variant="outline" size="icon" className={`rounded-full bg-white/90 backdrop-blur-sm ${!showPrevious && 'invisible'}`} onClick={onPrevious} disabled={!showPrevious}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Previous project</span>
        </Button>
        <Button variant="outline" size="icon" className={`rounded-full bg-white/90 backdrop-blur-sm ${!showNext && 'invisible'}`} onClick={onNext} disabled={!showNext}>
          <ArrowRight className="h-4 w-4" />
          <span className="sr-only">Next project</span>
        </Button>
      </div>
    </div>
  );
};

export default FeaturedProject;
