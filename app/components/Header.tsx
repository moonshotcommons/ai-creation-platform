'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet } from './wallet';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="w-full bg-white shadow-md">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <ul className="flex space-x-8">
            <li>
              <Link 
                href="/" 
                className={`text-lg ${pathname === '/' ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Home
              </Link>
            </li>
            <li>
              <Link 
                href="/generate" 
                className={`text-lg ${pathname === '/generate' ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Generate
              </Link>
            </li>
            <li>
              <Link 
                href="/display" 
                className={`text-lg ${pathname === '/display' ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Display
              </Link>
            </li>
          </ul>
          
          <div className="flex items-center">
            <Wallet />
          </div>
        </div>
      </nav>
    </header>
  );
} 