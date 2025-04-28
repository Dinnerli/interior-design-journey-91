
import { Link } from 'react-router-dom';
import { AspectRatio } from './ui/aspect-ratio';

const IntroSection = () => {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="animate-slide-up">
              <h2 className="text-5xl lg:text-6xl xl:text-7xl font-display leading-tight mb-8">
                Transforming Spaces<br />
                Elevating Lives
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                Step into a world where the art of Interior Design is meticulously crafted to bring together timeless elegance and cutting-edge modern Innovation, Allowing you to transform your living spaces into the epitome of luxury and sophistication
              </p>
            </div>
            <Link
              to="/contact"
              className="inline-block px-8 py-4 bg-primary text-primary-foreground font-medium rounded-none hover:bg-primary/90 transition-colors duration-300 animate-slide-up"
            >
              Contact Us
            </Link>
          </div>
          <div className="relative animate-slide-up">
            <div className="grid grid-cols-2 gap-4">
              <AspectRatio ratio={1}>
                <img
                  src="/lovable-uploads/32cb0d2c-fbd6-4e3f-9e28-d9cd1ac3e6fd.png"
                  alt="Living Space Design"
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
              <AspectRatio ratio={1}>
                <div className="bg-gray-100" />
              </AspectRatio>
              <AspectRatio ratio={1}>
                <div className="bg-gray-100" />
              </AspectRatio>
              <AspectRatio ratio={1}>
                <img
                  src="/lovable-uploads/32cb0d2c-fbd6-4e3f-9e28-d9cd1ac3e6fd.png"
                  alt="Interior Design"
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntroSection;
