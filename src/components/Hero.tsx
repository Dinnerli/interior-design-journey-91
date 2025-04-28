
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
      <div className="absolute inset-0">
        <img
          src="/lovable-uploads/65ea5dad-8617-4875-a202-5b1297621604.png"
          alt="Interior Design Hero"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-black opacity-30"></div>
      </div>
      <div className="relative z-10 text-center px-4 sm:px-6 animate-fade-in">
        <h1 className="text-4xl md:text-6xl font-display font-medium mb-6">
          Bespoke Interior Design Solutions
        </h1>
        <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-12">
          Creating spaces that inspire, comfort, and elevate your everyday experience
        </p>
      </div>
      <button 
        onClick={scrollToContent} 
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10 animate-bounce"
        aria-label="Scroll down"
      >
        <ArrowDown size={32} className="text-white" />
      </button>
    </section>
  );
};

export default Hero;
