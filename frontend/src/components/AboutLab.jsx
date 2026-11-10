import './AboutLab.css';
const electrical = 'Electrical and Electronics Engineering';
const nuclear = 'Nuclear Science Engineering Department';
const founder = { name:'Dr. Davies Segera', role:'Founder', department:electrical, email:'davies.segera@uonbi.ac.ke', initials:'DS' };
const members = [
  {name:'Margret Gitau',role:'Master’s student',department:nuclear,email:'margaretgitau07@gmail.com',initials:'MG'},
  {name:'Bill Maritim',role:'Master’s student',department:electrical,email:'billmaritim@students.uonbi.ac.ke',initials:'BM'},
  {name:'Dr. Anne Wambui Mutahi',role:'Academic member',department:nuclear,email:'wambuimutahi@gmail.com',initials:'AM'},
  {name:'Tess Kissinger',role:'Graduate',department:electrical,email:'tessinakissinger@gmail.com',initials:'TK'},
  {name:'Lennox Kahati',role:'Master’s student',department:electrical,email:'lennoxkahati@gmail.com',initials:'LK'},
  {name:'Dr. Susan Karuga',role:'Academic member',department:'Nuclear Science Department',email:'swkaruga@uonbi.ac.ke',initials:'SK'},
];
export default function AboutLab({ presentation = false }) {
 return <article className={`about-lab${presentation ? ' about-lab-slide' : ''}`} aria-label="About UoN IoT Lab">
  <section className="lab-intro" aria-labelledby="lab-heading">
   <div><p className="lab-eyebrow">University of Nairobi · UiL</p><h2 id="lab-heading">UoN IoT Lab</h2><p className="lab-lead">Bringing embedded systems and artificial intelligence together.</p><p>Founded by Dr. Davies Segera, UoN IoT Lab brings together academic colleagues and undergraduate and postgraduate students to learn, experiment, and collaborate on embedded systems, AI, and connected technologies.</p><a className="lab-team-link" href="#lab-members">Meet the people behind the lab ↓</a></div>
   <div className="lab-university-mark"><img src="/uon-logo.png" width="1200" height="797" alt="University of Nairobi" /><span>UoN IoT Lab <b>UiL</b></span></div>
  </section>
  <section aria-labelledby="lab-focus-heading" className="lab-focus"><div className="lab-section-heading"><p className="lab-eyebrow">Our focus</p><h2 id="lab-focus-heading">From physical systems to intelligent applications</h2></div><div className="lab-focus-grid">
   <article><span className="lab-focus-number">01</span><h3>Embedded systems</h3><p>Working with hardware, sensors, and software that connect digital ideas to the physical world.</p></article>
   <article><span className="lab-focus-number">02</span><h3>Artificial intelligence</h3><p>Exploring how data and AI can support intelligent systems and practical applications.</p></article>
   <article><span className="lab-focus-number">03</span><h3>Connected technologies</h3><p>Bringing sensing, connectivity, and data together through the Internet of Things.</p></article>
  </div></section>
  <section className="lab-founder" aria-labelledby="lab-founder-heading"><div className="lab-founder-story"><p className="lab-eyebrow">How it began</p><h2 id="lab-founder-heading">Built around people and shared curiosity</h2><p>Dr. Davies Segera established the lab by bringing together fellow academics and students across different stages of study. That collaborative foundation connects academic experience with student-led learning and hands-on exploration.</p><p className="lab-founder-note">A shared space for undergraduate and postgraduate participation, alongside academic colleagues and graduates.</p></div><article className="lab-member-card lab-founder-card"><span className="lab-member-role">Founder</span><div className="lab-member-identity"><span className="lab-initials" aria-hidden="true">{founder.initials}</span><h3>{founder.name}</h3></div><p className="lab-member-department">{founder.department}</p><a href={`mailto:${founder.email}`}>{founder.email}</a></article></section>
  <section id="lab-members" aria-labelledby="lab-members-heading"><div className="lab-section-heading"><p className="lab-eyebrow">Our people</p><h2 id="lab-members-heading">The lab community</h2><p>Academic members, postgraduate students, and graduates working across engineering disciplines.</p></div><div className="lab-member-grid">{members.map(member=><article key={member.email} className="lab-member-card"><span className="lab-member-role">{member.role}</span><div className="lab-member-identity"><span className="lab-initials" aria-hidden="true">{member.initials}</span><h3>{member.name}</h3></div><p className="lab-member-department">{member.department}</p><a href={`mailto:${member.email}`}>{member.email}</a></article>)}</div></section>
  <footer className="lab-about-footer"><span>UoN IoT Lab · UiL</span><a href="/">Explore the air quality observatory →</a></footer>
 </article>;
}
