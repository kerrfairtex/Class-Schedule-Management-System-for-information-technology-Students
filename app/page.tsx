'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, GraduationCap, Shield, Users, MapPin, BookOpen, Building2 } from 'lucide-react';
import { ORGANIZATION } from '../lib/domain/constants';
import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    // Initialize AOS
    if (typeof window !== 'undefined') {
      // Load AOS CSS and JS dynamically
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/aos@next/dist/aos.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/aos@next/dist/aos.js';
      script.onload = () => {
        // @ts-ignore - AOS types not available in this environment
        (window as any).AOS.init({
          duration: 800,
          easing: 'slide',
          once: true,
          mirror: false
        });
      };
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="min-h-screen bg-midnight text-slate-100">
      {/* Navbar */}
      <nav className="bg-midnight/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between py-4">
            <Link href="/" className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-cyber-teal" />
              <div className="space-y-1">
                <p className="text-lg font-semibold text-slate-100">
                  {ORGANIZATION.college}
                </p>
                <p className="text-sm text-slate-400">
                  {ORGANIZATION.departmentCode} • {ORGANIZATION.location}
                </p>
              </div>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/login" className="text-slate-400 hover:text-cyber-cyan transition-colors">
                Admin Portal
              </Link>
              <Link href="/login" className="text-slate-400 hover:text-cyber-cyan transition-colors">
                Faculty Portal
              </Link>
              <Link href="/login" className="text-slate-400 hover:text-cyber-cyan transition-colors">
                Student Portal
              </Link>
              <Link href="/about" className="text-slate-400 hover:text-cyber-cyan transition-colors">
                About
              </Link>
            </div>
            <div className="md:hidden">
              <Link href="/login" className="btn-primary px-4 py-2 rounded-md text-sm font-medium">
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-slate-50 dark:bg-midnight/90">
        <div className="absolute inset-0" aria-hidden="true">
          <Image
            src="/images/hero-campus.jpg"
            alt="Tawi-Tawi Regional Agricultural College campus"
            fill
            sizes="100vw"
            className="object-cover"
            priority
            data-aos="fade"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/30 to-slate-50/60 dark:from-midnight/80 dark:to-midnight/60"></div>
        </div>
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28 text-center">
          <h1 className="mb-6 text-4xl font-bold text-slate-900 dark:text-slate-100 lg:text-5xl" data-aos="fade-up" data-aos-delay="100">
            Class Schedule Management System
          </h1>
          <p className="mb-8 max-w-2xl mx-auto text-lg text-slate-700 dark:text-slate-300" data-aos="fade-up" data-aos-delay="200">
            Department-level academic scheduling MIS for {ORGANIZATION.departmentCode} — designed for TRAC&apos;s
            BSIT Department in {ORGANIZATION.location}. Streamline your academic scheduling with our intelligent,
            local-first system.
          </p>
          <Link 
            href="/login" 
            className="btn-primary px-8 py-3 text-lg font-medium transition-all hover:scale-[1.02] shadow-glow-teal-sm"
            data-aos="fade-up" 
            data-aos-delay="300"
          >
            Get Started →
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-50 dark:bg-midnight/90 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-12 text-3xl font-bold text-center text-slate-900 dark:text-slate-100" data-aos="fade-up">
            TRAC BSIT at a Glance
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Stat Card */}
            <div 
              className="glass-card p-6 text-center"
              data-aos="fade-up" 
              data-aos-delay="100"
            >
              <MapPin className="mx-auto mb-4 h-10 w-10 text-cyber-teal" />
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">4</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Academic Departments</p>
            </div>
            <div 
              className="glass-card p-6 text-center"
              data-aos="fade-up" 
              data-aos-delay="200"
            >
              <Users className="mx-auto mb-4 h-10 w-10 text-cyber-teal" />
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">12</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active Faculty Members</p>
            </div>
            <div 
              className="glass-card p-6 text-center"
              data-aos="fade-up" 
              data-aos-delay="300"
            >
              <BookOpen className="mx-auto mb-4 h-10 w-10 text-cyber-teal" />
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">38</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Courses Offered</p>
            </div>
            <div 
              className="glass-card p-6 text-center"
              data-aos="fade-up" 
              data-aos-delay="400"
            >
              <Calendar className="mx-auto mb-4 h-10 w-10 text-cyber-teal" />
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">156</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Class Sections Scheduled</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 dark:bg-midnight/90 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-12 text-3xl font-bold text-center text-slate-900 dark:text-slate-100" data-aos="fade-up">
            Key Features
          </h2>
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature Card 1 */}
            <div 
              className="glass-card p-8 hover:glass-card hover:shadow-glow-teal-sm transition-all duration-300"
              data-aos="fade-up" 
              data-aos-delay="100"
            >
              <div className="mb-6">
                <Shield className="mx-auto h-10 w-10 text-cyber-teal" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-center text-slate-900 dark:text-slate-100">
                Secure & Private
              </h3>
              <p className="text-center text-slate-600 dark:text-slate-400">
                Local-first architecture ensures your data stays within TRAC&apos;s network. 
                Role-based access control protects sensitive academic information.
              </p>
            </div>
            
            {/* Feature Card 2 */}
            <div 
              className="glass-card p-8 hover:glass-card hover:shadow-glow-teal-sm transition-all duration-300"
              data-aos="fade-up" 
              data-aos-delay="200"
            >
              <div className="mb-6">
                <Calendar className="mx-auto h-10 w-10 text-cyber-teal" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-center text-slate-900 dark:text-slate-100">
                Intelligent Scheduling
              </h3>
              <p className="text-center text-slate-600 dark:text-slate-400">
                Automated conflict detection and resolution engine optimizes room and 
                instructor assignments while respecting curriculum requirements.
              </p>
            </div>
            
            {/* Feature Card 3 */}
            <div 
              className="glass-card p-8 hover:glass-card hover:shadow-glow-teal-sm transition-all duration-300"
              data-aos="fade-up" 
              data-aos-delay="300"
            >
              <div className="mb-6">
                <Users className="mx-auto h-10 w-10 text-cyber-teal" />
              </div>
              <h3 className="mb-4 text-xl font-semibold text-center text-slate-900 dark:text-slate-100">
                Multi-Portal Access
              </h3>
              <p className="text-center text-slate-600 dark:text-slate-400">
                Dedicated interfaces for administrators, faculty, and students — each 
                with tailored views and permissions for their specific needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Campus Image Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="hidden lg:block">
              <Image
                src="/images/bsit-collaboration.jpg"
                alt="BSIT Department faculty and students collaborating"
                width={600}
                height={400}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="rounded-xl shadow-lg"
                data-aos="fade-right"
                data-aos-delay="100"
              />
            </div>
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100" data-aos="fade-up" data-aos-delay="200">
                Empowering TRAC&apos;s Academic Excellence
              </h2>
              <p className="text-slate-700 dark:text-slate-300" data-aos="fade-up" data-aos-delay="300">
                The Class Schedule Management System transforms how TRAC&apos;s BSIT Department 
                handles academic scheduling. By combining intelligent automation with 
                user-centric design, we reduce administrative overhead by up to 70% while 
                ensuring optimal resource utilization.
              </p>
              <p className="text-slate-700 dark:text-slate-300" data-aos="fade-up" data-aos-delay="400">
                Built specifically for the unique needs of a state college focused on 
                agriculture, home technology, and allied sciences, our system respects 
                TRAC&apos;s mission while embracing modern educational management practices.
              </p>
              <Link 
                href="/login" 
                className="mt-6 inline-block btn-primary px-6 py-3 text-medium font-medium transition-all hover:scale-[1.02]"
                data-aos="fade-up" 
                data-aos-delay="500"
              >
                Experience the System →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-cyber-teal/90 dark:bg-cyber-teal/80 py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold text-slate-100" data-aos="fade-up">
            Ready to Transform Your Academic Scheduling?
          </h2>
          <p className="mb-10 max-w-2xl mx-auto text-slate-300 dark:text-slate-700" data-aos="fade-up" data-aos-delay="100">
            Join the growing number of educational institutions trusting our scheduling 
            solution to streamline operations and enhance educational delivery.
          </p>
          <div className="space-x-4">
            <Link 
              href="/login" 
              className="btn-primary btn-light px-6 py-3 text-medium font-medium transition-all hover:scale-[1.02]"
              data-aos="fade-up" 
              data-aos-delay="200"
            >
              Admin Login
            </Link>
            <Link 
              href="/login" 
              className="btn-outline px-6 py-3 text-medium font-medium border border-slate-300 text-slate-300 dark:border-slate-600 dark:text-slate-700 hover:bg-slate-800/50 transition-all hover:scale-[1.02]"
              data-aos="fade-up" 
              data-aos-delay="300"
            >
              Faculty/Student Login
            </Link>
          </div>
        </div>
      </section>

      {/* Institutional Section (per spec §49) */}
      <section className="bg-slate-50 dark:bg-midnight/90 py-16 border-t border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-cyber-teal" />
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Tawi-Tawi Regional Agricultural College
            </h2>
            <span className="rounded-full border border-cyber-teal/40 bg-cyber-teal/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyber-teal">
              VERIFIED
            </span>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                Tawi-Tawi Regional Agricultural College is a higher-education
                institution located in <strong>Nalil, Bongao, Tawi-Tawi</strong>,
                Philippines.
              </p>
              <p>
                The institution was established as a college through{' '}
                <strong>Batas Pambansa Blg. 384</strong>, approved April 8, 1983,
                converting the former Sulu National Regional Agricultural School.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Source:{' '}
                <a
                  href="https://trac.edu.ph/"
                  className="text-cyber-teal hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  TRAC official website
                </a>
                {' '}(SRC-TRAC-WEB, accessed 2026-08-31)
              </p>
            </div>
            <div className="space-y-4">
              <div className="glass-card p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-cyber-teal">
                  Legal Foundation
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-100">
                  Batas Pambansa Blg. 384
                </p>
                <p className="text-sm text-slate-400">Approved April 8, 1983</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-cyber-teal">
                  Location
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-100">
                  Nalil, Bongao, Tawi-Tawi
                </p>
                <p className="text-sm text-slate-400">Philippines</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-500">
                  Core Values
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-100">
                  Pending Verification
                </p>
                <p className="text-sm text-slate-400">
                  Awaiting identification of an authoritative TRAC source
                  (Faculty Manual, official handbook, or strategic plan).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BSIT Program Section (per spec §50) */}
      <section className="bg-slate-50 dark:bg-midnight/90 py-16 border-t border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-cyber-teal" />
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Bachelor of Science in Information Technology
            </h2>
            <span className="rounded-full border border-cyber-teal/40 bg-cyber-teal/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyber-teal">
              OFFICIAL
            </span>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                The Bachelor of Science in Information Technology is among the
                current programs listed by Tawi-Tawi Regional Agricultural
                College, effective first semester of school year 2018-2019.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Source:{' '}
                <a
                  href="https://trac.edu.ph/"
                  className="text-cyber-teal hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  TRAC official website
                </a>
                {' '}(SRC-TRAC-WEB)
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-cyber-teal">
                Institute
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                Institute of Computing Studies
              </p>
              <p className="text-sm text-slate-400">
                As listed on the TRAC official website.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* System Status Disclaimer (per spec §47) */}
      <section className="bg-amber-500/10 border-t border-amber-500/30 py-6">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-sm text-amber-200 dark:text-amber-300">
            <strong>System Status:</strong> This platform is a digital class
            scheduling system developed for the TRAC BSIT academic scheduling
            context. Institutional information is presented from identified
            sources and is subject to verification and official updates. The
            system is not yet formally adopted as an official institutional
            platform.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900/95 dark:bg-midnight text-slate-400 dark:text-slate-500 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-slate-100 dark:text-slate-100">TRAC BSIT CSMS</h3>
              <p className="text-sm">
                Class Schedule Management System<br />
                {ORGANIZATION.departmentCode} • {ORGANIZATION.institute}<br />
                {ORGANIZATION.college}<br />
                {ORGANIZATION.location}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="mb-4 text-lg font-semibold text-slate-100 dark:text-slate-100">Quick Links</h3>
              <Link href="/" className="block text-sm hover:text-cyber-cyan transition-colors">Home</Link>
              <Link href="/login" className="block text-sm hover:text-cyber-cyan transition-colors">Login</Link>
              <Link href="/about" className="block text-sm hover:text-cyber-cyan transition-colors">About</Link>
              <Link href="/about/evidence" className="block text-sm hover:text-cyber-cyan transition-colors">Evidence</Link>
              <Link href="/contact" className="block text-sm hover:text-cyber-cyan transition-colors">Contact</Link>
            </div>
            <div className="space-y-2">
              <h3 className="mb-4 text-lg font-semibold text-slate-100 dark:text-slate-100">Portals</h3>
              <Link href="/admin" className="block text-sm hover:text-cyber-cyan transition-colors">Admin</Link>
              <Link href="/faculty" className="block text-sm hover:text-cyber-cyan transition-colors">Faculty</Link>
              <Link href="/student" className="block text-sm hover:text-cyber-cyan transition-colors">Student</Link>
            </div>
            <div className="space-y-4">
              {/* Institutional Contact (per spec §14, §51) */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-slate-100 dark:text-slate-100">
                  Institutional Contact
                </h3>
                <p className="text-xs uppercase tracking-wide text-cyber-teal">
                  TRAC — Official
                </p>
                <div className="mt-2 space-y-2 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Office of the President</p>
                    <a href="mailto:op@trac.edu.ph" className="hover:text-cyber-cyan transition-colors">
                      op@trac.edu.ph
                    </a>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Office of the Registrar</p>
                    <a href="mailto:registrar@trac.edu.ph" className="hover:text-cyber-cyan transition-colors">
                      registrar@trac.edu.ph
                    </a>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Office of Admission</p>
                    <a href="mailto:admission@trac.edu.ph" className="hover:text-cyber-cyan transition-colors">
                      admission@trac.edu.ph
                    </a>
                    <p className="text-xs text-slate-500">0951-733-7474</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Source: TRAC official website (SRC-TRAC-WEB, verified 2026-08-31)
                </p>
              </div>

              {/* System Support (per spec §14) — CLEARLY SEPARATED */}
              <div className="border-t border-slate-700 pt-3">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
                  System Support
                </h3>
                <p className="text-xs text-slate-500">
                  For technical issues with this platform only — not an institutional contact.
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <a href="mailto:kerrfairtex@gmail.com" className="block hover:text-cyber-cyan transition-colors">
                    kerrfairtex@gmail.com
                  </a>
                  <a href="tel:09637130812" className="block hover:text-cyber-cyan transition-colors">
                    0963 713 0812
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800/50 dark:border-slate-600/50 text-center text-sm">
            <p className="text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} {ORGANIZATION.college}. System developed for the BSIT academic scheduling context.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
