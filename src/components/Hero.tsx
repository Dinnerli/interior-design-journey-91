
import { ArrowDown } from 'lucide-react';

const Hero = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 80,
      behavior: 'smooth'
    });
  };
  
  return (
    <section className="relative h-screen flex items-center justify-center bg-design-dark text-white">
      <div className="absolute inset-0">
        <img 
          src="/lovable-uploads/65ea5dad-8617-4875-a202-5b1297621604.png" 
          alt="Hero background" 
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
      
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-display font-medium mb-4">Interior Design Excellence</h1>
        <p className="text-xl md:text-2xl text-white/80 mb-12">
          Creating thoughtful spaces that inspire and elevate everyday living
        </p>
        <button 
          onClick={scrollToContent}
          className="animate-bounce bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors duration-300"
          aria-label="Scroll down"
        >
          <ArrowDown className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
};

export default Hero;
