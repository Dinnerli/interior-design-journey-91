import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);
  const navItems = [{
    name: 'Home',
    path: '/'
  }, {
    name: 'Projects',
    path: '/projects'
  }, {
    name: 'About',
    path: '/about'
  }, {
    name: 'Contact',
    path: '/contact'
  }];
  return <nav className="">
      <div className="max-w-7xl px-4 sm:px-6 bg-white py-[19px] my-0 lg:px-[20px] mx-[20px]">
        <div className="flex justify-between items-center h-20 bg-design-light">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center hover:text-design-gold transition-colors">
              <img src="https://usbueyoxlcbsajndxumu.supabase.co/storage/v1/object/public/images//DA-logo.png" alt="BEURANT DESIGN Logo" className="h-20 w-auto mr-1\\n object-cover" />
              <span className="font-display tracking-tight text-design-softgold mx-[240px] px-[6px] text-justify font-thin text-3xl">                                   DESIGN ALCHEMY </span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-8">
              {navItems.map(item => <Link key={item.name} to={item.path} className={`font-medium transition-all duration-200 hover:text-design-gold ${location.pathname === item.path ? 'text-design-gold border-b border-design-gold pb-1' : 'text-design-softgold'}`}>
                  {item.name}
                </Link>)}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-design-softgold hover:text-design-gold focus:outline-none" aria-expanded="false">
              <span className="sr-only">{isOpen ? 'Close menu' : 'Open menu'}</span>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && <div className="md:hidden bg-design-darkgray backdrop-blur-md shadow-md animate-fade-in border-t border-design-gold/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map(item => <Link key={item.name} to={item.path} className={`block px-3 py-4 text-base font-medium transition-all duration-200 ${location.pathname === item.path ? 'text-design-gold border-l-2 border-design-gold pl-4' : 'text-design-softgold border-l-2 border-transparent'}`}>
                {item.name}
              </Link>)}
          </div>
        </div>}
    </nav>;
};
export default Navbar;