"use client"
import Link from "next/link"
import { Upload , HomeIcon, ThumbsUp, ZapIcon, ShieldHalf ,FileArchive, Blocks, LampDesk    } from "lucide-react";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
const Navbar = () => {

  return (
  <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 bg-opacity-40 backdrop-blur-md border-b border-border py-3">
    <div className='container mx-auto flex items-center justify-between'>
      {/* Logo */}
     

      <Link href="/" className="flex items-center gap-2">
        <div className='pg-1 bg-primary/10 rounded'>
          <ZapIcon className="w-4 h-4 text-primary" />
        </div>
        <span className='text-xl font-bold font-mono'>
          AI<span className='text-primary'>Resume</span>Matcher
        </span>
      </Link>
      
      {/* Navigation Links */}
      <nav className='flex items-center gap-5'>
        <>
        <Link href='/' className='flex items-center gap-1.5 text-sm hover:text-primary transition-colors'>
          <HomeIcon size={16}/>
          <span>Home</span>
        </Link>
     
        <Link href='/resume-builder'
          className='flex items-center gap-1.5 text-sm hover:text-primary transition-colors'>
          <Blocks  size={16}/>
          <span>Resume Builder</span>
        </Link>
       

        <Link href='/upload'
          className='flex items-center gap-1.5 text-sm hover:text-primary transition-colors'>
          <Upload  size={16}/>
          <span>Upload Resume</span>
        </Link>

        <Link href='/jobMatcher'
          className='flex items-center gap-1.5 text-sm hover:text-primary transition-colors'>
          <LampDesk   size={16}/>
          <span>JobMatcher</span>
        </Link>
       

        <Link href='/results'
          className='flex items-center gap-1.5 text-sm hover:text-primary transition-colors'>
          <ThumbsUp size={16}/>
          <span>Feedback</span>
        </Link>

         <Link href="/secure-test"
         className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
      <FileArchive size={16} />
      Archived
       </Link>
       
        <Link href="/secure-test"
         className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
      <ShieldHalf size={16}/>
      Secure Test
       </Link>
        

         </>
        {/* Authentication Buttons */}
                <>
                 <SignedOut>
              <SignInButton />
              <SignUpButton>
                <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
                
                </>
            
             
                
      </nav>
    </div>
  </header>
  

    
  )
}

export default Navbar