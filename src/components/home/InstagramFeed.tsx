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
    imageUrl: 'https://scontent-bru2-1.cdninstagram.com/v/t51.82787-15/784198286_18365932321209781_6309893115341553099_n.jpg?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=106&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0xJUFMuYmVzdF9pbWFnZV91cmxnZW4uQzMifQ%3D%3D&_nc_ohc=GVcTYKsOmo8Q7kNvwFdc7Yq&_nc_oc=AdrYCBTgSpTBFXbTjOSqRTDQ3we7agKq6NdUNL4Kx14BEZRevQwmpyG7V93bsxyxwmcmNg4V3y0sQxJnZ1bxNM9A&_nc_zt=23&_nc_ht=scontent-bru2-1.cdninstagram.com&_nc_gid=bdlnMB78UgG0qrgN7L3NCQ&_nc_ss=7f60f&oh=00_AQF8fgvy_s9bWEgdECTv1UbdFTzSLBxsr1noK2r9Y2NvvQ&oe=6A91559B',
    link: 'https://www.instagram.com/youtumundial/',
    likes: '425',
    comments: '18',
  },
  {
    id: '2',
    type: 'reel',
    imageUrl: 'https://scontent-bru2-1.cdninstagram.com/v/t51.71878-15/783183797_2110524246250123_6855370854098477117_n.jpg?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=101&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0xJUFMuYmVzdF9pbWFnZV91cmxnZW4uQzMifQ%3D%3D&_nc_ohc=q_r_YanuEewQ7kNvwGrDI5A&_nc_oc=AdqgojyP00-K9a76Gm3E1yZ3Ea9jEGLuZdz1awa3kk2vLFPNieyUNkfYw296dUrOGENi7L63TRDHvRS6zEtW9MOr&_nc_zt=23&_nc_ht=scontent-bru2-1.cdninstagram.com&_nc_gid=bdlnMB78UgG0qrgN7L3NCQ&_nc_ss=7f60f&oh=00_AQGRwXXEPxHFUC3fA32xcqXjfqDBOYCpYfLrPHkAl3ulXA&oe=6A912EA7',
    link: 'https://www.instagram.com/youtumundial/',
    likes: '312',
    comments: '9',
  },
  {
    id: '3',
    type: 'reel',
    imageUrl: 'https://scontent-bru2-1.cdninstagram.com/v/t51.82787-15/784002962_18365817892209781_3424985196903659398_n.jpg?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=101&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0xJUFMuYmVzdF9pbWFnZV91cmxnZW4uQzMifQ%3D%3D&_nc_ohc=VYXtHuNE1cIQ7kNvwHlh7T6&_nc_oc=Ado1cF6dNbjc0usJm2iqlZj2FQIV-VQNf41_SfTYuh8FCA3tmSdMVIkoT1BFnLqo5BAq8aP2VZXrnQK2xPiGHaPw&_nc_zt=23&_nc_ht=scontent-bru2-1.cdninstagram.com&_nc_gid=bdlnMB78UgG0qrgN7L3NCQ&_nc_ss=7f60f&oh=00_AQGJh-1IISZJet902yDyx40euD2vP6vyEiR8CpSba5mQtg&oe=6A9133C8',
    link: 'https://www.instagram.com/youtumundial/',
    likes: '560',
    comments: '24',
  },
  {
    id: '4',
    type: 'reel',
    imageUrl: 'https://scontent-bru2-1.cdninstagram.com/v/t51.82787-15/784002956_18365813518209781_3722829179687184689_n.jpg?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=101&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0xJUFMuYmVzdF9pbWFnZV91cmxnZW4uQzMifQ%3D%3D&_nc_ohc=KtS6bXRbbzsQ7kNvwGP1V8U&_nc_oc=AdoMfiqu2CzKkJilaMR-zczbRipCdRSq18prx7zLEK4aKiwkajffLt_xIqObnSzqgTkYjm73F5LsG6QHEeX-0Nn9&_nc_zt=23&_nc_ht=scontent-bru2-1.cdninstagram.com&_nc_gid=bdlnMB78UgG0qrgN7L3NCQ&_nc_ss=7f60f&oh=00_AQGJhB_f2_tsckfkduawDznQP3fqi2vdF2ily_qT9_8JVw&oe=6A915055',
    link: 'https://www.instagram.com/youtumundial/',
    likes: '280',
    comments: '12',
  },
  {
    id: '5',
    type: 'image',
    imageUrl: 'https://scontent-bru2-1.cdninstagram.com/v/t51.82787-15/776351289_18364781851209781_1070909284891277696_n.jpg?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=104&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=cbQY86sa3ZsQ7kNvwEbuPwY&_nc_oc=AdrWcJxoB6v6FZqU1FAz89EBHzUNoMCfAZFHnQIB0f1vv5fXcuWTVNr2d3dKoEipiYVLn9Z2Yb4imMI6Vhhfrtls&_nc_zt=23&_nc_ht=scontent-bru2-1.cdninstagram.com&_nc_gid=bdlnMB78UgG0qrgN7L3NCQ&_nc_ss=7f60f&oh=00_AQECM_5j_8lPNFykylFtm0AZQAE_LaZjoj91zlhGc3lvgQ&oe=6A912E19',
    link: 'https://www.instagram.com/youtumundial/',
    likes: '890',
    comments: '45',
  },
  {
    id: '6',
    type: 'reel',
    imageUrl: 'https://scontent-bru2-1.cdninstagram.com/v/t51.82787-15/776020800_18364781299209781_3467758176030365158_n.jpg?stp=dst-jpg_e35_s640x640_tt6&_nc_cat=101&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0xJUFMuYmVzdF9pbWFnZV91cmxnZW4uQzMifQ%3D%3D&_nc_ohc=gZLcf0gHKdsQ7kNvwHnP6cs&_nc_oc=AdrLG1AgpmePk7CyjRb4NxQmrK62vHo45k8Y61Z7ftGsqrQUQGR31I3QtcWRh_BRCdB0OojV6xnQtxxkCB28MpZt&_nc_zt=23&_nc_ht=scontent-bru2-1.cdninstagram.com&_nc_gid=bdlnMB78UgG0qrgN7L3NCQ&_nc_ss=7f60f&oh=00_AQGqbP7BELdoXD5s0AKojO1YxJLsNbrJQsv2-EOrB5ZwJg&oe=6A9145BE',
    link: 'https://www.instagram.com/youtumundial/',
    likes: '410',
    comments: '15',
  },
];

export function InstagramFeed() {
  return (
    <section className="container-wide py-16 md:py-24 border-t border-border">
      <div className="text-center mb-12">
        <a 
          href="https://www.instagram.com/youtumundial/" 

          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors group mb-4"
        >
          <Instagram className="h-5 w-5" />
          <span className="font-semibold tracking-wider uppercase text-sm">Follow us on Instagram</span>
        </a>
        <h2 className="heading-section">Shop the Look</h2>
        <p className="text-muted-foreground mt-2">
          Tag us @youtumundial to be featured
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
          href="https://www.instagram.com/youtumundial/"
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
