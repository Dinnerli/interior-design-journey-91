
import { ArrowDown } from 'lucide-react';

const Hero = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 80,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative h-screen flex items-center justify-center overflow-hidden bg-design-dark">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/lovable-uploads/18307451-b9dd-4802-9af5-7d7b1ec0ec44.png" 
          alt="Interior design background" 
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center text-white">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-medium leading-tight mb-6 animate-fade-in">
          Interior Design <br />
          <span className="text-primary">Reimagined</span>
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-white/80 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Creating inspiring spaces that reflect your vision and elevate your environment
        </p>
        <button 
          onClick={scrollToContent}
          className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center animate-bounce absolute left-1/2 -translate-x-1/2 bottom-12 text-white/70 hover:text-white hover:border-white/50 transition-colors"
          aria-label="Scroll down"
        >
          <ArrowDown size={20} />
        </button>
      </div>
    </div>
  );
};

export default Hero;
