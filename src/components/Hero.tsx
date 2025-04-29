
import { ArrowDown } from 'lucide-react';

const Hero = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 80,
      behavior: 'smooth'
    });
  };
  
  return (
    <section className="relative h-screen flex items-center justify-center bg-design-dark text-white overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <img 
          src="/lovable-uploads/0c2291eb-05da-4f0e-83a1-239a723f73bc.png" 
          alt="Background Pattern" 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-light mb-6 animate-fade-in">
          Crafting Spaces That<br />Inspire &amp; Elevate
        </h1>
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-12 animate-fade-in animation-delay-300">
          Interior design solutions that transform environments into exceptional experiences.
        </p>
        <button 
          onClick={scrollToContent}
          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors duration-300 animate-bounce"
          aria-label="Scroll down"
        >
          <ArrowDown className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
};

export default Hero;
