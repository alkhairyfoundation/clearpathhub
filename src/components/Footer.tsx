'use client';

import Link from 'next/link';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
}

export default function Footer({ 
  schoolName = 'ClearPath Edu Hub', 
  schoolAddress = 'Your Address Here',
  schoolPhone = '+1 234 567 890',
  schoolEmail = 'info@clearpatheduhub.com'
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-2xl font-bold mb-4">{schoolName}</h2>
            <p className="text-slate-400 mb-4 max-w-md">
              Empowering students with quality education and preparing them for a brighter future. 
              ClearPath Edu Hub - where learning meets excellence.
            </p>
            <div className="flex gap-4">
              <a 
                href="https://facebook.com/clearpatheduhub" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 rounded-lg hover:bg-blue-600 transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a 
                href="https://twitter.com/clearpatheduhub" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 rounded-lg hover:bg-sky-500 transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a 
                href="https://instagram.com/clearpatheduhub" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 rounded-lg hover:bg-pink-600 transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a 
                href="https://youtube.com/@clearpatheduhub" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 rounded-lg hover:bg-red-600 transition-colors"
                aria-label="YouTube"
              >
                <Youtube size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3 text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>{schoolAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <span>{schoolPhone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <span>{schoolEmail}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/about" className="block text-slate-400 hover:text-white transition-colors">
                About Us
              </Link>
              <Link href="/admissions" className="block text-slate-400 hover:text-white transition-colors">
                Admissions
              </Link>
              <Link href="/contact" className="block text-slate-400 hover:text-white transition-colors">
                Contact
              </Link>
              <Link href="/portal" className="block text-slate-400 hover:text-white transition-colors">
                Portal Login
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
          <p>© {currentYear} {schoolName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}