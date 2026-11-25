'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, GraduationCap, Shield, Users, MapPin, BookOpen, Building2 } from 'lucide-react';
import { ORGANIZATION, DEVELOPERS } from '../lib/domain/constants';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [stats, setStats] = useState<{ departments: number; faculty: number; courses: number; sections: number } | null>(null);
  useEffect(() => {
    fetch('/api/public/stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && typeof d.departments === 'number') setStats(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Scroll reveal for [data-aos] elements. Replaces the unpinned AOS script
    // that was loaded from unpkg at runtime: a supply-chain risk, and blocked
    // by the Content-Security-Policy. Content stays visible without JS and
    // for visitors who prefer reduced motion.
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('aos-animate');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    document.querySelectorAll<HTMLElement>('[data-aos]').forEach((el) => {
      if (el.dataset.aosDelay) el.style.transitionDelay = `${el.dataset.aosDelay}ms`;
      observer.observe(el);
    });
    root.classList.add('reveal-ready');
    return () => {
      observer.disconnect();
      root.classList.remove('reveal-ready');
    };
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
              <Link href="/schedules" className="text-slate-400 hover:text-cyber-cyan transition-colors">Schedules</Link>
              <Link href="/rooms" className="text-slate-400 hover:text-cyber-cyan transition-colors">Rooms</Link>
              <Link href="/faculty" className="text-slate-400 hover:text-cyber-cyan transition-colors">Faculty</Link>
              <Link href="/about" className="text-slate-400 hover:text-cyber-cyan transition-colors">
                About
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:border-cyber-teal hover:text-cyber-cyan"
              >
                Staff sign in
              </Link>
            </div>
            <div className="md:hidden flex items-center gap-3">
              <Link href="/schedules" className="text-slate-400 hover:text-cyber-cyan transition-colors">Schedules</Link>
              <Link href="/rooms" className="text-slate-400 hover:text-cyber-cyan transition-colors">Rooms</Link>
              <Link href="/login" className="text-sm text-slate-500 hover:text-cyber-cyan">
                Staff
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-slate-50 dark:bg-midnight/90">
        <div className="absolute inset-0" aria-hidden="true">
          <Image
            src="/it-building.png"
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
            BSIT Department in {ORGANIZATION.location}. Students: your class schedule, rooms and instructors are
            all here. No account needed.
          </p>
          <div className="flex flex-wrap justify-center gap-3" data-aos="fade-up" data-aos-delay="300">
            <Link
              href="/schedules"
              className="btn-primary px-8 py-3 text-lg font-medium transition-all hover:scale-[1.02] shadow-glow-teal-sm"
            >
              Find my class schedule →
            </Link>
            <Link
              href="/rooms"
              className="rounded-lg border border-slate-400 px-6 py-3 text-lg font-medium text-slate-900 hover:border-cyber-teal dark:border-slate-500 dark:text-slate-100"
            >
              Free rooms now
            </Link>
          </div>
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
            <Link href="/departments"
              className="glass-card block p-6 text-center transition-all hover:shadow-glow-teal-sm hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyber-teal"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <MapPin className="mx-auto mb-4 h-10 w-10 text-cyber-teal" />
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats ? stats.departments : '–'}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Academic Departments</p>
            </Link>
            <Link href="/faculty"
              className="glass-card block p-6 text-center transition-all hover:shadow-glow-teal-sm hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyber-teal"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <Users className="mx-auto mb-4 h-10 w-10 text-cyber-teal" />
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats ? stats.faculty : '–'}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active Faculty Members</p>
            </Link>
            <Link href="/courses"
              className="glass-card block p-6 text-center transition-all hover:shadow-glow-teal-sm hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyber-teal"
              data-aos="fade-up"
              data-aos-delay="300"
            >
              <BookOpen className="mx-auto mb-4 h-10 w-10 text-cyber-teal" />
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats ? stats.courses : '–'}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Courses Offered</p>
            </Link>
            <Link href="/sections"
              className="glass-card block p-6 text-center transition-all hover:shadow-glow-teal-sm hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyber-teal"
              data-aos="fade-up"
              data-aos-delay="400"
            >
              <Calendar className="mx-auto mb-4 h-10 w-10 text-cyber-teal" />
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats ? stats.sections : '–'}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Class Sections Scheduled</p>
            </Link>
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
                Open to Every Student
              </h3>
              <p className="text-center text-slate-600 dark:text-slate-400">
                Students and visitors see published schedules, room availability and the
                faculty directory without an account. Administrators and faculty sign in
                to plan and publish them.
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
                href="/schedules"
                className="mt-6 inline-block btn-primary px-6 py-3 text-medium font-medium transition-all hover:scale-[1.02]"
                data-aos="fade-up"
                data-aos-delay="500"
              >
                Browse class schedules →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-cyber-teal/90 dark:bg-cyber-teal/80 py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold text-midnight" data-aos="fade-up">
            Where is my next class?
          </h2>
          <p className="mb-10 max-w-2xl mx-auto text-midnight/80" data-aos="fade-up" data-aos-delay="100">
            Pick your section to see your weekly timetable, instructors and rooms, then print it or save the link.
          </p>
          <Link
            href="/schedules"
            className="btn-primary btn-light px-6 py-3 text-medium font-medium transition-all hover:scale-[1.02]"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            Find my class schedule
          </Link>
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
              <Link href="/login" className="block text-sm hover:text-cyber-cyan transition-colors">Staff sign in</Link>
              <Link href="/about" className="block text-sm hover:text-cyber-cyan transition-colors">About</Link>
              <Link href="/about/evidence" className="block text-sm hover:text-cyber-cyan transition-colors">Evidence</Link>
              <Link href="/contact" className="block text-sm hover:text-cyber-cyan transition-colors">Contact</Link>
              <Link href="/user-guidelines" className="block text-sm hover:text-cyber-cyan transition-colors">User Guidelines</Link>
              <Link href="/user-guide" className="block text-sm hover:text-cyber-cyan transition-colors">User Guide</Link>
            </div>
            <div className="space-y-2">
              <h3 className="mb-4 text-lg font-semibold text-slate-100 dark:text-slate-100">For Students</h3>
              <Link href="/schedules" className="block text-sm hover:text-cyber-cyan transition-colors">Class schedules</Link>
              <Link href="/rooms" className="block text-sm hover:text-cyber-cyan transition-colors">Room availability</Link>
              <Link href="/faculty" className="block text-sm hover:text-cyber-cyan transition-colors">Faculty directory</Link>
              <Link href="/academic-calendar" className="block text-sm hover:text-cyber-cyan transition-colors">Academic calendar</Link>
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

              {/* Developers (per spec "Developer Attribution" section) — CLEARLY SEPARATED */}
              <div className="border-t border-slate-700 pt-3">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
                  System Developers
                </h3>
                <p className="text-xs text-slate-500">
                  This system was developed by the following students. See the{' '}
                  <Link href="/developers" className="text-cyber-teal hover:text-cyber-cyan">
                    Developers
                  </Link>{' '}
                  page for full attribution. Not an institutional contact directory.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  For institutional inquiries, contact the official TRAC
                  offices listed above.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800/50 dark:border-slate-600/50 text-center text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Class Schedule Management System · TRAC BSIT
            </p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} {ORGANIZATION.college}. System developed for the BSIT academic scheduling context.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Developers:{' '}
              <Link href="/developers" className="text-cyber-teal hover:text-cyber-cyan">
                {DEVELOPERS.join(', ')}
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
