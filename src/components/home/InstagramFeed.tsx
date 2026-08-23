import { Instagram, Play, Heart, MessageCircle } from 'lucide-react';

interface InstagramPost {
  id: string;
  type: 'image' | 'reel';
  imageUrl: string;
  link: string;
  likes: string;
  comments: string;
}

const INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: '1',
    type: 'reel',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop',
    link: 'https://www.instagram.com/youtumundialshop/',
    likes: '1.2k',
    comments: '45',
  },
  {
    id: '2',
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1539109132314-3477524c8d95?w=400&h=500&fit=crop',
    link: 'https://www.instagram.com/youtumundialshop/',
    likes: '850',
    comments: '12',
  },
  {
    id: '3',
    type: 'reel',
    imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=500&fit=crop',
    link: 'https://www.instagram.com/youtumundialshop/',
    likes: '2.4k',
    comments: '89',
  },
  {
    id: '4',
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=500&fit=crop',
    link: 'https://www.instagram.com/youtumundialshop/',
    likes: '1.1k',
    comments: '34',
  },
  {
    id: '5',
    type: 'reel',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=500&fit=crop',
    link: 'https://www.instagram.com/youtumundialshop/',
    likes: '3.1k',
    comments: '120',
  },
  {
    id: '6',
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=400&h=500&fit=crop',
    link: 'https://www.instagram.com/youtumundialshop/',
    likes: '920',
    comments: '28',
  },
];

export function InstagramFeed() {
  return (
    <section className="container-wide py-16 md:py-24 border-t border-border">
      <div className="text-center mb-12">
        <a 
          href="https://www.instagram.com/youtumundialshop/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors group mb-4"
        >
          <Instagram className="h-5 w-5" />
          <span className="font-semibold tracking-wider uppercase text-sm">Follow us on Instagram</span>
        </a>
        <h2 className="heading-section">Shop the Look</h2>
        <p className="text-muted-foreground mt-2">
          Tag us @youtumundialshop to be featured
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
        {INSTAGRAM_POSTS.map((post) => (
          <a
            key={post.id}
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-[4/5] overflow-hidden bg-muted rounded-lg md:rounded-xl"
          >
            <img
              src={post.imageUrl}
              alt="Instagram post"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            
            {/* Type Icon */}
            {post.type === 'reel' && (
              <div className="absolute top-3 right-3 z-10 text-white drop-shadow-md">
                <Play className="h-5 w-5 fill-current" />
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6 text-white">
              <div className="flex items-center gap-1.5 font-medium">
                <Heart className="h-5 w-5 fill-current" />
                <span>{post.likes}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <MessageCircle className="h-5 w-5 fill-current" />
                <span>{post.comments}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
      
      <div className="mt-12 text-center">
        <a
          href="https://www.instagram.com/youtumundialshop/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border-b border-muted-foreground/30 pb-1"
        >
          View our profile
        </a>
      </div>
    </section>
  );
}
