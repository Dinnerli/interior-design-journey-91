import { ArrowDown } from 'lucide-react';

const Hero = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 80,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src="/Assets/modern-tranquility-1.png" 
          alt="Interior Design" 
          className="w-full h-full object-cover object-center" 
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 animate-fade-in">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-medium text-white mb-6 leading-tight">
          Transforming Spaces, <br />Elevating Lives
        </h1>
        <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10">
          Creating timeless interiors that inspire and transform the way you live
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a 
            href="/projects" 
            className="px-8 py-3 bg-white hover:bg-white/90 text-neutral-900 font-medium transition-colors duration-300 min-w-[200px]"
          >
            View Projects
          </a>
          <a 
            href="/contact" 
            className="px-8 py-3 bg-transparent hover:bg-white/10 text-white font-medium transition-colors duration-300 border border-white min-w-[200px]"
          >
            Get in Touch
          </a>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <button 
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/80 hover:text-white transition-colors duration-300 animate-bounce"
        aria-label="Scroll Down"
      >
        <ArrowDown size={24} />
      </button>
    </div>
  );
};

export default Hero;
