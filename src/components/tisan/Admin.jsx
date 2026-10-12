import { useState } from 'react';
import { useTisan } from './state';
import { Icon, Button, IconButton, Photo, Field, makeId } from './ui';
import { categories, galleryCategories, validImageUrl } from '../../data/tisan';

const confirmDelete = (what) => window.confirm(`Delete this ${what}? This cannot be undone in this session.`);
const move = (list, index, dir) => {
  const next = [...list];
  const to = index + dir;
  if (to < 0 || to >= next.length) return list;
  [next[index], next[to]] = [next[to], next[index]];
  return next;
};
const imageSections = ['Hero Banners', 'About', 'Project Covers', 'Project Details', 'Services', 'Sustainability', 'Featured Banner', 'Gallery', 'Why Choose Us', 'Contact'];
const iconTypes = ['building', 'grid', 'leaf', 'sun', 'quote', 'shield', 'water'];

function Status({ on }) {
  return <span className={`status ${on ? 'published' : ''}`}>{on ? 'Published' : 'Hidden'}</span>;
}

function ImagePreview({ url, alt }) {
  if (!url) return <div className="preview-image image-fallback">No image URL yet</div>;
  if (!validImageUrl(url)) return <div className="preview-image image-fallback" role="alert">Invalid image URL — use a secure https:// link</div>;
  return <div className="preview-image"><Photo image={{ url, alt, published: true }} /></div>;
}

/* Saves an image URL into the shared image library, returning the image id. */
function upsertImage(images, id, url, meta) {
  const existing = id && images.find((x) => x.id === id);
  if (existing) return { images: images.map((x) => (x.id === id ? { ...x, url, alt: meta.alt || x.alt, caption: meta.caption || x.caption } : x)), id };
  const newId = `image-${makeId()}`;
  return { images: [...images, { id: newId, url, published: true, category: 'Architecture', ...meta }], id: newId };
}

function useCollection(key) {
  const { data, setData, notify } = useTisan();
  const list = data[key];
  const set = (fn) => setData((d) => ({ ...d, [key]: fn(d[key]) }));
  return {
    list,
    data,
    setData,
    notify,
    toggle: (id) => set((l) => l.map((x) => (x.id === id ? { ...x, published: !x.published } : x))),
    reorder: (i, dir) => set((l) => move(l, i, dir)),
    remove: (id, what) => {
      if (!confirmDelete(what)) return;
      set((l) => l.filter((x) => x.id !== id));
      notify(`${what[0].toUpperCase() + what.slice(1)} deleted.`);
    },
  };
}

function Heading({ title, note, onAdd, addLabel }) {
  return (
    <div className="admin-heading">
      <div><h2>{title}</h2>{note && <p>{note}</p>}</div>
      {onAdd && <Button icon="plus" onClick={onAdd}>{addLabel}</Button>}
    </div>
  );
}

function RowActions({ i, total, record, onEdit, onToggle, onMove, onDelete }) {
  return (
    <div className="table-actions">
      {onMove && <IconButton name="up" label="Move up" onClick={() => onMove(i, -1)} disabled={i === 0} />}
      {onMove && <IconButton name="down" label="Move down" onClick={() => onMove(i, 1)} disabled={i === total - 1} />}
      {onToggle && <IconButton name="eye" label={record.published ? 'Hide' : 'Publish'} onClick={() => onToggle(record.id)} />}
      {onEdit && <IconButton name="edit" label="Edit" onClick={() => onEdit(record)} />}
      {onDelete && <IconButton name="trash" label="Delete" onClick={() => onDelete(record.id)} />}
    </div>
  );
}

function FormShell({ title, onCancel, onSubmit, children }) {
  return (
    <form className="admin-form mb-8" noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <h3>{title}</h3>
      <div className="form-grid">{children}</div>
      <div className="form-actions"><Button type="submit" icon="check">Save</Button><Button variant="text" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

function PublishedBox({ value, onChange, label = 'Published on website' }) {
  return <label className="checkbox-row field-full"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}

/* ---------------- Dashboard ---------------- */
function Overview({ setView }) {
  const { data } = useTisan();
  const stats = [
    ['Total Projects', data.projects.length],
    ['Total Services', data.services.length],
    ['Gallery Images', data.gallery.length],
    ['Enquiries Received', data.enquiries.length],
    ['Published Testimonials', data.testimonials.filter((t) => t.published).length],
  ];
  return (
    <>
      <Heading title="Welcome back" note="All changes apply instantly to the public website for this session and reset when the page is refreshed." />
      <div className="stat-grid">{stats.map(([label, n]) => <div className="stat" key={label}><span>{label}</span><strong>{n}</strong></div>)}</div>
      <div className="admin-filters">
        <Button icon="plus" onClick={() => setView('projects')}>Add Project</Button>
        <Button variant="outline" onClick={() => setView('banners')}>Manage Banners</Button>
        <Button variant="outline" onClick={() => setView('gallery')}>Manage Gallery</Button>
        <Button variant="outline" onClick={() => setView('content')}>Edit Content</Button>
      </div>
      <h3 className="mb-4 mt-6 text-lg">Recent Enquiries</h3>
      {data.enquiries.length === 0 ? (
        <div className="admin-table-wrap"><div className="admin-empty">No enquiries yet. Submissions from the website's contact form will appear here during this session.</div></div>
      ) : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Type</th><th>Category</th><th>Status</th><th>Received</th></tr></thead><tbody>
          {data.enquiries.slice(0, 5).map((e) => <tr key={e.id}><td className="record-name">{e.name}</td><td>{e.type}</td><td>{e.category}</td><td><span className={`status ${e.status === 'Resolved' ? 'published' : ''}`}>{e.status}</span></td><td>{new Date(e.createdAt).toLocaleString()}</td></tr>)}
        </tbody></table></div>
      )}
    </>
  );
}

/* ---------------- Hero banners ---------------- */
function BannerManager() {
  const c = useCollection('banners');
  const { image } = useTisan();
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const blank = { eyebrow: '', heading: '', description: '', primaryText: 'Explore Our Projects', primaryTarget: '#projects', secondaryText: 'Connect With Us', secondaryTarget: '#contact', published: true, url: '' };
  const edit = (b) => { setDraft({ ...b, url: image(b.imageId)?.url || '' }); setErrors({}); };
  const save = () => {
    const e = {};
    if (!draft.heading.trim()) e.heading = 'Heading is required.';
    if (!draft.primaryText.trim()) e.primaryText = 'Button text is required.';
    if (!validImageUrl(draft.url)) e.url = 'Enter a valid https:// image URL.';
    const taken = c.data.banners.some((b) => b.id !== draft.id && image(b.imageId)?.url === draft.url);
    if (taken) e.url = 'Another banner already uses this image. Each banner needs a unique image.';
    setErrors(e);
    if (Object.keys(e).length) return;
    c.setData((d) => {
      const { images, id } = upsertImage(d.images, draft.imageId, draft.url, { section: 'Hero Banners', alt: draft.heading, caption: draft.heading });
      const { url, ...record } = { ...draft, imageId: id };
      const banners = draft.id ? d.banners.map((b) => (b.id === draft.id ? record : b)) : [...d.banners, { ...record, id: makeId() }];
      return { ...d, images, banners };
    });
    c.notify('Banner saved — the hero slider is updated.');
    setDraft(null);
  };
  const f = (k) => ({ value: draft[k], onChange: (e) => setDraft({ ...draft, [k]: e.target.value }) });
  return (
    <>
      <Heading title="Hero Banners" note="The order below is the order slides appear. Hidden banners are removed from the slider." onAdd={() => { setDraft(blank); setErrors({}); }} addLabel="Add Banner" />
      {draft && (
        <FormShell title={draft.id ? 'Edit Banner' : 'New Banner'} onCancel={() => setDraft(null)} onSubmit={save}>
          <Field label="Image URL *" error={errors.url} full><input {...f('url')} placeholder="https://…" /><ImagePreview url={draft.url} alt={draft.heading} /></Field>
          <Field label="Eyebrow text"><input {...f('eyebrow')} maxLength={80} /></Field>
          <Field label="Heading *" error={errors.heading}><input {...f('heading')} maxLength={90} /></Field>
          <Field label="Description" full><textarea {...f('description')} maxLength={300} /></Field>
          <Field label="Primary button text *" error={errors.primaryText}><input {...f('primaryText')} maxLength={40} /></Field>
          <Field label="Primary button target"><select {...f('primaryTarget')}>{targets.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Secondary button text"><input {...f('secondaryText')} maxLength={40} /></Field>
          <Field label="Secondary button target"><select {...f('secondaryTarget')}>{targets.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <PublishedBox value={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
        </FormShell>
      )}
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>#</th><th>Image</th><th>Heading</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {c.list.map((b, i) => <tr key={b.id}><td>{i + 1}</td><td><div className="table-thumb"><Photo image={image(b.imageId)} /></div></td><td className="record-name">{b.heading}<br /><small className="text-muted-foreground">{b.eyebrow}</small></td><td><Status on={b.published} /></td><td><RowActions i={i} total={c.list.length} record={b} onEdit={edit} onToggle={c.toggle} onMove={c.reorder} onDelete={(id) => c.remove(id, 'banner')} /></td></tr>)}
      </tbody></table>{c.list.length === 0 && <div className="admin-empty">No banners. Add one so the hero section shows imagery.</div>}</div>
    </>
  );
}
const targets = ['#home', '#about', '#projects', '#services', '#sustainability', '#gallery', '#contact'];

/* ---------------- Projects ---------------- */
function ProjectsManager() {
  const c = useCollection('projects');
  const { image } = useTisan();
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [newUrl, setNewUrl] = useState('');
  const blank = { title: '', category: categories[0], description: '', label: 'Concept Showcase', featured: false, published: true, cover: '', gallery: [] };
  const edit = (p) => {
    setDraft({ ...p, cover: image(p.imageId)?.url || '', gallery: p.galleryIds.map((id) => ({ id, url: image(id)?.url || '' })) });
    setErrors({}); setNewUrl('');
  };
  const addGallery = () => {
    if (!validImageUrl(newUrl)) { setErrors({ ...errors, gallery: 'Enter a valid https:// image URL.' }); return; }
    setDraft({ ...draft, gallery: [...draft.gallery, { id: null, url: newUrl }] }); setNewUrl(''); setErrors({ ...errors, gallery: '' });
  };
  const makeCover = (i) => {
    const g = [...draft.gallery];
    const chosen = g[i];
    g[i] = { id: null, url: draft.cover };
    setDraft({ ...draft, cover: chosen.url, gallery: g.filter((x) => x.url) });
  };
  const save = () => {
    const e = {};
    if (!draft.title.trim()) e.title = 'Title is required.';
    if (!draft.description.trim()) e.description = 'Description is required.';
    if (!validImageUrl(draft.cover)) e.cover = 'Enter a valid https:// cover image URL.';
    setErrors(e);
    if (Object.keys(e).length) return;
    c.setData((d) => {
      let images = d.images;
      const cover = upsertImage(images, draft.id ? draft.imageId : null, draft.cover, { section: 'Project Covers', alt: draft.title, caption: draft.title, category: draft.category });
      images = cover.images;
      const galleryIds = draft.gallery.map((g) => {
        const r = upsertImage(images, g.id, g.url, { section: 'Project Details', alt: `${draft.title} detail`, caption: draft.title });
        images = r.images;
        return r.id;
      });
      const { cover: _c, gallery: _g, ...rest } = draft;
      const record = { ...rest, title: draft.title.trim(), imageId: cover.id, galleryIds };
      let projects = draft.id ? d.projects.map((p) => (p.id === draft.id ? record : p)) : [...d.projects, { ...record, id: makeId() }];
      if (record.featured) projects = projects.map((p) => ({ ...p, featured: p.title === record.title && p.imageId === record.imageId }));
      return { ...d, images, projects };
    });
    c.notify('Project saved — the portfolio is updated.');
    setDraft(null);
  };
  const f = (k) => ({ value: draft[k], onChange: (e) => setDraft({ ...draft, [k]: e.target.value }) });
  return (
    <>
      <Heading title="Projects" note="Sample concept showcases. Keep the demo label so visitors know these are not completed company projects." onAdd={() => { setDraft(blank); setErrors({}); }} addLabel="Add Project" />
      {draft && (
        <FormShell title={draft.id ? 'Edit Project' : 'New Project'} onCancel={() => setDraft(null)} onSubmit={save}>
          <Field label="Project title *" error={errors.title}><input {...f('title')} maxLength={80} /></Field>
          <Field label="Category"><select {...f('category')}>{categories.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Description *" error={errors.description} full><textarea {...f('description')} maxLength={600} /></Field>
          <Field label="Demo status label"><select {...f('label')}>{['Concept Showcase', 'Sample Project'].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Cover image URL *" error={errors.cover}><input {...f('cover')} placeholder="https://…" /><ImagePreview url={draft.cover} alt={draft.title} /></Field>
          <div className="image-editor-list">
            <span className="text-xs">Detail gallery images ({draft.gallery.length})</span>
            {draft.gallery.map((g, i) => (
              <div className="image-editor-row" key={`${g.url}-${i}`}>
                <Photo image={{ url: g.url, published: true, alt: 'Project detail' }} />
                <small className="break-all">{g.url}</small>
                <div className="table-actions">
                  <IconButton name="up" label="Move image up" disabled={i === 0} onClick={() => setDraft({ ...draft, gallery: move(draft.gallery, i, -1) })} />
                  <IconButton name="down" label="Move image down" disabled={i === draft.gallery.length - 1} onClick={() => setDraft({ ...draft, gallery: move(draft.gallery, i, 1) })} />
                  <IconButton name="image" label="Use as cover image" onClick={() => makeCover(i)} />
                  <IconButton name="trash" label="Remove image" onClick={() => setDraft({ ...draft, gallery: draft.gallery.filter((_, j) => j !== i) })} />
                </div>
              </div>
            ))}
            <Field label="Add detail image URL" error={errors.gallery}><div className="flex gap-2"><input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…" /><Button variant="outline" onClick={addGallery}>Add</Button></div></Field>
          </div>
          <PublishedBox value={draft.featured} onChange={(v) => setDraft({ ...draft, featured: v })} label="Featured project" />
          <PublishedBox value={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
        </FormShell>
      )}
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cover</th><th>Title</th><th>Category</th><th>Images</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {c.list.map((p, i) => <tr key={p.id}><td><div className="table-thumb"><Photo image={image(p.imageId)} /></div></td><td className="record-name">{p.title}{p.featured && <><br /><small className="text-secondary">★ Featured</small></>}<br /><small className="text-muted-foreground">{p.label}</small></td><td>{p.category}</td><td>{p.galleryIds.length + 1}</td><td><Status on={p.published} /></td><td><RowActions i={i} total={c.list.length} record={p} onEdit={edit} onToggle={c.toggle} onMove={c.reorder} onDelete={(id) => c.remove(id, 'project')} /></td></tr>)}
      </tbody></table>{c.list.length === 0 && <div className="admin-empty">No projects yet.</div>}</div>
    </>
  );
}

/* ---------------- Services ---------------- */
function ServicesManager() {
  const c = useCollection('services');
  const { image } = useTisan();
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const blank = { title: '', description: '', icon: 'building', published: true, url: '' };
  const save = () => {
    const e = {};
    if (!draft.title.trim()) e.title = 'Title is required.';
    if (!draft.description.trim()) e.description = 'Description is required.';
    if (!validImageUrl(draft.url)) e.url = 'Enter a valid https:// image URL.';
    setErrors(e);
    if (Object.keys(e).length) return;
    c.setData((d) => {
      const { images, id } = upsertImage(d.images, draft.imageId, draft.url, { section: 'Services', alt: draft.title, caption: draft.title });
      const { url, ...record } = { ...draft, imageId: id };
      return { ...d, images, services: draft.id ? d.services.map((s) => (s.id === draft.id ? record : s)) : [...d.services, { ...record, id: makeId() }] };
    });
    c.notify('Service saved.');
    setDraft(null);
  };
  const f = (k) => ({ value: draft[k], onChange: (e) => setDraft({ ...draft, [k]: e.target.value }) });
  return (
    <>
      <Heading title="Services" note="Editable sample service descriptions." onAdd={() => { setDraft(blank); setErrors({}); }} addLabel="Add Service" />
      {draft && (
        <FormShell title={draft.id ? 'Edit Service' : 'New Service'} onCancel={() => setDraft(null)} onSubmit={save}>
          <Field label="Service title *" error={errors.title}><input {...f('title')} maxLength={80} /></Field>
          <Field label="Icon"><select {...f('icon')}>{iconTypes.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Description *" error={errors.description} full><textarea {...f('description')} maxLength={400} /></Field>
          <Field label="Image URL *" error={errors.url} full><input {...f('url')} placeholder="https://…" /><ImagePreview url={draft.url} alt={draft.title} /></Field>
          <PublishedBox value={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
        </FormShell>
      )}
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Image</th><th>Service</th><th>Icon</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {c.list.map((s, i) => <tr key={s.id}><td><div className="table-thumb"><Photo image={image(s.imageId)} /></div></td><td className="record-name">{s.title}</td><td><Icon name={s.icon} /></td><td><Status on={s.published} /></td><td><RowActions i={i} total={c.list.length} record={s} onEdit={(r) => { setDraft({ ...r, url: image(r.imageId)?.url || '' }); setErrors({}); }} onToggle={c.toggle} onMove={c.reorder} onDelete={(id) => c.remove(id, 'service')} /></td></tr>)}
      </tbody></table>{c.list.length === 0 && <div className="admin-empty">No services yet.</div>}</div>
    </>
  );
}

/* ---------------- Gallery ---------------- */
function GalleryManager() {
  const c = useCollection('gallery');
  const { image } = useTisan();
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const blank = { title: '', alt: '', category: galleryCategories[0], published: true, url: '' };
  const edit = (g) => { const img = image(g.imageId); setDraft({ ...g, url: img?.url || '', alt: img?.alt || '' }); setErrors({}); };
  const save = () => {
    const e = {};
    if (!draft.title.trim()) e.title = 'Title is required.';
    if (!draft.alt.trim()) e.alt = 'Alt text helps visitors using screen readers.';
    if (!validImageUrl(draft.url)) e.url = 'Enter a valid https:// image URL.';
    setErrors(e);
    if (Object.keys(e).length) return;
    c.setData((d) => {
      let { images, id } = upsertImage(d.images, draft.imageId, draft.url, { section: 'Gallery', alt: draft.alt, caption: draft.title, category: draft.category });
      images = images.map((x) => (x.id === id ? { ...x, alt: draft.alt, caption: draft.title, category: draft.category, published: draft.published } : x));
      const { url, alt, ...record } = { ...draft, imageId: id };
      return { ...d, images, gallery: draft.id ? d.gallery.map((g) => (g.id === draft.id ? record : g)) : [...d.gallery, { ...record, id: makeId() }] };
    });
    c.notify('Gallery image saved.');
    setDraft(null);
  };
  const f = (k) => ({ value: draft[k], onChange: (e) => setDraft({ ...draft, [k]: e.target.value }) });
  return (
    <>
      <Heading title="Gallery" note="Images shown in “The Architecture Edit”. Paste an image link — uploads aren't supported in this demo." onAdd={() => { setDraft(blank); setErrors({}); }} addLabel="Add Image" />
      {draft && (
        <FormShell title={draft.id ? 'Edit Gallery Image' : 'New Gallery Image'} onCancel={() => setDraft(null)} onSubmit={save}>
          <Field label="Image URL *" error={errors.url} full><input {...f('url')} placeholder="https://…" /><ImagePreview url={draft.url} alt={draft.alt} /></Field>
          <Field label="Title / caption *" error={errors.title}><input {...f('title')} maxLength={80} /></Field>
          <Field label="Category"><select {...f('category')}>{galleryCategories.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Alt text *" error={errors.alt} full><input {...f('alt')} maxLength={160} /></Field>
          <PublishedBox value={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
        </FormShell>
      )}
      <div className="admin-image-grid">
        {c.list.map((g, i) => (
          <div className="admin-image-card" key={g.id}>
            <Photo image={{ ...image(g.imageId), published: true }} />
            <div><small>{g.category} · #{i + 1}</small><h3>{g.title}</h3><div className="flex items-center justify-between gap-2"><Status on={g.published} /><RowActions i={i} total={c.list.length} record={g} onEdit={edit} onToggle={c.toggle} onMove={c.reorder} onDelete={(id) => c.remove(id, 'gallery image')} /></div></div>
          </div>
        ))}
      </div>
      {c.list.length === 0 && <div className="admin-empty">The gallery is empty.</div>}
    </>
  );
}

/* ---------------- All images ---------------- */
function ImageManager() {
  const { data, setData, notify } = useTisan();
  const [section, setSection] = useState('All');
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const list = data.images.filter((x) => section === 'All' || x.section === section);
  const set = (fn) => setData((d) => ({ ...d, images: fn(d.images) }));
  const usedBy = (id) => {
    const refs = [];
    data.banners.forEach((b) => b.imageId === id && refs.push('banner'));
    data.projects.forEach((p) => (p.imageId === id || p.galleryIds.includes(id)) && refs.push('project'));
    data.services.forEach((s) => s.imageId === id && refs.push('service'));
    data.gallery.forEach((g) => g.imageId === id && refs.push('gallery'));
    return refs;
  };
  const save = () => {
    const e = {};
    if (!validImageUrl(draft.url)) e.url = 'Enter a valid https:// image URL.';
    if (!draft.alt.trim()) e.alt = 'Alt text is required.';
    if (data.images.some((x) => x.id !== draft.id && x.url === draft.url)) e.url = 'This image is already used elsewhere. Please use a unique photo.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setData((d) => {
      if (draft.id) return { ...d, images: d.images.map((x) => (x.id === draft.id ? draft : x)), gallery: d.gallery.map((g) => (g.imageId === draft.id ? { ...g, title: draft.caption || g.title, category: galleryCategories.includes(draft.category) ? draft.category : g.category } : g)) };
      const id = `image-${makeId()}`;
      const next = { ...d, images: [...d.images, { ...draft, id }] };
      if (draft.section === 'Gallery') next.gallery = [...d.gallery, { id: makeId(), title: draft.caption || draft.alt, category: galleryCategories.includes(draft.category) ? draft.category : 'Architecture', imageId: id, published: draft.published }];
      return next;
    });
    notify('Image saved — its section on the website is updated.');
    setDraft(null);
  };
  const remove = (img) => {
    const refs = usedBy(img.id);
    if (!window.confirm(refs.length ? `This image is used by a ${refs.join(', ')} record. Delete it anyway? That spot will show no image.` : 'Delete this image?')) return;
    setData((d) => ({ ...d, images: d.images.filter((x) => x.id !== img.id), gallery: d.gallery.filter((g) => g.imageId !== img.id) }));
    notify('Image deleted.');
  };
  const reorder = (img, dir) => set((all) => {
    const same = all.filter((x) => x.section === img.section);
    const i = same.findIndex((x) => x.id === img.id);
    const target = same[i + dir];
    if (!target) return all;
    const a = all.indexOf(img), b = all.findIndex((x) => x.id === target.id);
    return move(all, a, b - a);
  });
  const f = (k) => ({ value: draft[k], onChange: (e) => setDraft({ ...draft, [k]: e.target.value }) });
  return (
    <>
      <Heading title="Image Management" note={`Every photo on the website, by section (${data.images.length} images). Edits here change the image shown in that section.`} onAdd={() => { setDraft({ url: '', alt: '', caption: '', section: section === 'All' ? 'Gallery' : section, category: 'Architecture', published: true }); setErrors({}); }} addLabel="Add Image" />
      {draft && (
        <FormShell title={draft.id ? 'Edit Image' : 'New Image'} onCancel={() => setDraft(null)} onSubmit={save}>
          <Field label="Image URL *" error={errors.url} full><input {...f('url')} placeholder="https://…" /><ImagePreview url={draft.url} alt={draft.alt} /></Field>
          <Field label="Alt text *" error={errors.alt}><input {...f('alt')} maxLength={160} /></Field>
          <Field label="Caption"><input {...f('caption')} maxLength={120} /></Field>
          <Field label="Website section"><select {...f('section')} disabled={!!draft.id}>{imageSections.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Category"><select {...f('category')}>{[...new Set([...galleryCategories, ...categories])].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <PublishedBox value={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
        </FormShell>
      )}
      <div className="admin-filters"><select value={section} onChange={(e) => setSection(e.target.value)} aria-label="Filter by section"><option>All</option>{imageSections.map((x) => <option key={x}>{x}</option>)}</select></div>
      <div className="admin-image-grid">
        {list.map((img) => (
          <div className="admin-image-card" key={img.id}>
            <Photo image={{ ...img, published: true }} />
            <div><small>{img.section} · {img.category}</small><h3>{img.caption || img.alt}</h3>
              <div className="flex items-center justify-between gap-2"><Status on={img.published} />
                <div className="table-actions">
                  <IconButton name="up" label="Move earlier in section" onClick={() => reorder(img, -1)} />
                  <IconButton name="down" label="Move later in section" onClick={() => reorder(img, 1)} />
                  <IconButton name="eye" label={img.published ? 'Hide' : 'Publish'} onClick={() => set((all) => all.map((x) => (x.id === img.id ? { ...x, published: !x.published } : x)))} />
                  <IconButton name="edit" label="Edit" onClick={() => { setDraft({ ...img }); setErrors({}); }} />
                  <IconButton name="trash" label="Delete" onClick={() => remove(img)} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 && <div className="admin-empty">No images in this section.</div>}
    </>
  );
}

/* ---------------- Enquiries ---------------- */
function EnquiriesManager() {
  const { data, setData, notify } = useTisan();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [open, setOpen] = useState(null);
  const term = q.trim().toLowerCase();
  const list = data.enquiries.filter((e) => (status === 'All' || e.status === status) && (!term || [e.name, e.email, e.phone].some((v) => v.toLowerCase().includes(term))));
  const setStatusOf = (id, s) => setData((d) => ({ ...d, enquiries: d.enquiries.map((e) => (e.id === id ? { ...e, status: s } : e)) }));
  const remove = (id) => { if (!confirmDelete('enquiry')) return; setData((d) => ({ ...d, enquiries: d.enquiries.filter((e) => e.id !== id) })); if (open === id) setOpen(null); notify('Enquiry deleted.'); };
  return (
    <>
      <Heading title="Enquiries" note="Demo submissions from the website form in this session only. They are not sent or saved anywhere else." />
      <div className="admin-filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or phone" aria-label="Search enquiries" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">{['All', 'New', 'In Progress', 'Resolved'].map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Contact</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {list.map((e) => (
          <>
            <tr key={e.id}><td className="record-name">{e.name}<br /><small className="text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</small></td><td>{e.email}<br />{e.phone}</td><td>{e.type}<br /><small>{e.category}</small></td>
              <td><select value={e.status} onChange={(ev) => setStatusOf(e.id, ev.target.value)} aria-label={`Status for ${e.name}`} className="border border-border bg-card p-2 text-xs">{['New', 'In Progress', 'Resolved'].map((s) => <option key={s}>{s}</option>)}</select></td>
              <td><div className="table-actions"><IconButton name="eye" label={open === e.id ? 'Hide details' : 'Read details'} onClick={() => setOpen(open === e.id ? null : e.id)} /><IconButton name="trash" label="Delete" onClick={() => remove(e.id)} /></div></td></tr>
            {open === e.id && <tr key={`${e.id}-d`}><td colSpan={5} className="whitespace-pre-wrap leading-relaxed"><strong>Message:</strong> {e.message}</td></tr>}
          </>
        ))}
      </tbody></table>
        {list.length === 0 && <div className="admin-empty">{data.enquiries.length ? 'No enquiries match your search.' : 'No enquiries yet. Submit the contact form on the website to see one appear here.'}</div>}
      </div>
    </>
  );
}

/* ---------------- Testimonials & FAQs ---------------- */
function SimpleManager({ collKey, title, note, what, fields, blank, columns }) {
  const c = useCollection(collKey);
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const save = () => {
    const e = {};
    fields.forEach(([k, label]) => { if (!String(draft[k] || '').trim()) e[k] = `${label} is required.`; });
    setErrors(e);
    if (Object.keys(e).length) return;
    c.setData((d) => ({ ...d, [collKey]: draft.id ? d[collKey].map((x) => (x.id === draft.id ? draft : x)) : [...d[collKey], { ...draft, id: makeId() }] }));
    c.notify(`${what[0].toUpperCase() + what.slice(1)} saved.`);
    setDraft(null);
  };
  return (
    <>
      <Heading title={title} note={note} onAdd={() => { setDraft(blank); setErrors({}); }} addLabel={`Add ${what[0].toUpperCase() + what.slice(1)}`} />
      {draft && (
        <FormShell title={draft.id ? `Edit ${what}` : `New ${what}`} onCancel={() => setDraft(null)} onSubmit={save}>
          {fields.map(([k, label, long]) => <Field key={k} label={`${label} *`} error={errors[k]} full={long}>{long ? <textarea value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} maxLength={800} /> : <input value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} maxLength={150} />}</Field>)}
          <PublishedBox value={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
        </FormShell>
      )}
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map(([, l]) => <th key={l}>{l}</th>)}<th>Status</th><th>Actions</th></tr></thead><tbody>
        {c.list.map((r, i) => <tr key={r.id}>{columns.map(([k]) => <td key={k} className={k === columns[0][0] ? 'record-name' : ''}>{String(r[k]).slice(0, 120)}</td>)}<td><Status on={r.published} /></td><td><RowActions i={i} total={c.list.length} record={r} onEdit={(x) => { setDraft({ ...x }); setErrors({}); }} onToggle={c.toggle} onMove={c.reorder} onDelete={(id) => c.remove(id, what)} /></td></tr>)}
      </tbody></table>{c.list.length === 0 && <div className="admin-empty">No {what}s yet. {collKey === 'testimonials' && 'The testimonials section stays hidden on the website until one is published.'}</div>}</div>
    </>
  );
}

/* ---------------- Content ---------------- */
function ContentManager() {
  const { data, setData, notify } = useTisan();
  const [c, setC] = useState(data.content);
  const [banner, setBanner] = useState(data.banners[0] ? { ...data.banners[0] } : null);
  const [error, setError] = useState('');
  const f = (k) => ({ value: c[k] || '', onChange: (e) => setC({ ...c, [k]: e.target.value }) });
  const b = (k) => ({ value: banner[k] || '', onChange: (e) => setBanner({ ...banner, [k]: e.target.value }) });
  const required = ['aboutHeading', 'aboutDescription', 'sustainHeading', 'sustainDescription', 'whyHeading', 'whyDescription', 'footerIntro'];
  const save = () => {
    if (required.some((k) => !String(c[k] || '').trim()) || (banner && (!banner.heading.trim() || !banner.primaryText.trim()))) { setError('Headings and descriptions cannot be empty.'); return; }
    setError('');
    setData((d) => ({ ...d, content: c, banners: banner ? d.banners.map((x) => (x.id === banner.id ? banner : x)) : d.banners }));
    notify('Website content updated.');
  };
  return (
    <form className="content-editor" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Heading title="Website Content" note="Edit text across the public website. Use one line per bullet point." />
      {banner && <div className="admin-form"><h3>Hero (first banner)</h3><div className="form-grid">
        <Field label="Eyebrow"><input {...b('eyebrow')} maxLength={80} /></Field>
        <Field label="Heading"><input {...b('heading')} maxLength={90} /></Field>
        <Field label="Description" full><textarea {...b('description')} maxLength={300} /></Field>
        <Field label="Primary button label"><input {...b('primaryText')} maxLength={40} /></Field>
        <Field label="Primary button target"><select {...b('primaryTarget')}>{targets.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Secondary button label"><input {...b('secondaryText')} maxLength={40} /></Field>
        <Field label="Secondary button target"><select {...b('secondaryTarget')}>{targets.map((t) => <option key={t}>{t}</option>)}</select></Field>
      </div></div>}
      <div className="admin-form"><h3>About Us</h3><div className="form-grid">
        <Field label="Heading" full><input {...f('aboutHeading')} maxLength={90} /></Field>
        <Field label="Description" full><textarea {...f('aboutDescription')} maxLength={1200} /></Field>
        <Field label="Points (one per line)" full><textarea {...f('aboutPoints')} maxLength={600} /></Field>
      </div></div>
      <div className="admin-form"><h3>Sustainability</h3><div className="form-grid">
        <Field label="Heading" full><input {...f('sustainHeading')} maxLength={90} /></Field>
        <Field label="Description" full><textarea {...f('sustainDescription')} maxLength={1200} /></Field>
        <Field label="Priorities (one per line)" full><textarea {...f('sustainPoints')} maxLength={800} /></Field>
      </div></div>
      <div className="admin-form"><h3>Why Choose Us</h3><div className="form-grid">
        <Field label="Heading" full><input {...f('whyHeading')} maxLength={90} /></Field>
        <Field label="Description" full><textarea {...f('whyDescription')} maxLength={1000} /></Field>
        <Field label="Highlights (one per line)" full><textarea {...f('whyPoints')} maxLength={800} /></Field>
      </div></div>
      <div className="admin-form"><h3>Featured Project Banner & Footer</h3><div className="form-grid">
        <Field label="Featured project"><select {...f('featuredProjectId')}>{data.projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
        <Field label="Featured heading"><input {...f('featuredHeading')} maxLength={90} /></Field>
        <Field label="Footer introduction" full><textarea {...f('footerIntro')} maxLength={400} /></Field>
      </div></div>
      <p className="text-xs text-muted-foreground">Contact details and the developer credit are edited in Site Settings.</p>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="form-actions"><Button type="submit" icon="check">Save Content</Button><Button variant="text" onClick={() => { setC(data.content); setBanner(data.banners[0] ? { ...data.banners[0] } : null); }}>Discard Changes</Button></div>
    </form>
  );
}

/* ---------------- Settings ---------------- */
function SettingsManager() {
  const { data, setData, notify } = useTisan();
  const [s, setS] = useState(data.settings);
  const [errors, setErrors] = useState({});
  const f = (k) => ({ value: s[k], onChange: (e) => setS({ ...s, [k]: e.target.value }) });
  const save = () => {
    const e = {};
    if (!s.name.trim()) e.name = 'Company name is required.';
    if (!/^[+\d][\d\s()-]{6,19}$/.test(s.phone)) e.phone = 'Enter a valid phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) e.email = 'Enter a valid email address.';
    if (!validImageUrl(s.logo)) e.logo = 'Enter a valid logo image URL.';
    if (!s.credit.trim()) e.credit = 'The developer credit must remain visible.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setData((d) => ({ ...d, settings: { ...s, address: s.address.trim() || 'Address details to be updated' } }));
    notify('Site settings saved.');
  };
  const colors = [['primary', 'Primary (forest green)'], ['secondary', 'Secondary (gold)'], ['ivory', 'Background (ivory)'], ['white', 'Cards (white)'], ['sage', 'Sustainability (sage)']];
  return (
    <form className="content-editor" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Heading title="Site Settings" note="Company details, colours and which sections are shown on the website." />
      <div className="admin-form"><h3>Company Details</h3><div className="form-grid">
        <Field label="Company display name *" error={errors.name} full><input {...f('name')} maxLength={100} /></Field>
        <Field label="Phone number *" error={errors.phone}><input {...f('phone')} maxLength={20} /></Field>
        <Field label="Email address *" error={errors.email}><input {...f('email')} maxLength={255} /></Field>
        <Field label="Address" full><input {...f('address')} maxLength={250} /></Field>
        <Field label="Logo image URL *" error={errors.logo} full><input {...f('logo')} /><ImagePreview url={s.logo} alt="Logo preview" /></Field>
        <Field label="Footer developer credit *" error={errors.credit} full><input {...f('credit')} maxLength={120} /></Field>
      </div></div>
      <div className="admin-form"><h3>Brand Colours</h3><div className="form-grid">
        {colors.map(([k, l]) => <Field key={k} label={l}><div className="flex gap-2"><input type="color" value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value.toUpperCase() })} className="h-12 w-16 p-1" aria-label={`${l} picker`} /><input value={s[k]} onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && setS({ ...s, [k]: e.target.value })} aria-label={`${l} hex`} /></div></Field>)}
      </div><Button variant="text" onClick={() => setS({ ...s, primary: '#1E2925', secondary: '#A8895B', ivory: '#F5F2EA', white: '#FFFFFF', sage: '#71866C' })}>Restore brand colours</Button></div>
      <div className="admin-form"><h3>Section Visibility</h3><div className="form-grid">
        {Object.keys(s.visibility).map((k) => <label className="checkbox-row" key={k}><input type="checkbox" checked={s.visibility[k]} onChange={(e) => setS({ ...s, visibility: { ...s.visibility, [k]: e.target.checked } })} />Show {k} section</label>)}
      </div></div>
      <div className="form-actions"><Button type="submit" icon="check">Save Settings</Button><Button variant="text" onClick={() => { setS(data.settings); setErrors({}); }}>Discard Changes</Button></div>
    </form>
  );
}

/* ---------------- Login ---------------- */
export function AdminLogin() {
  const { data, go, setAuthenticated, image } = useTisan();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [errors, setErrors] = useState({});
  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!u.trim()) err.u = 'Username is required.';
    if (!p) err.p = 'Password is required.';
    if (!err.u && !err.p && (u.trim() !== 'admin' || p !== 'Tisan@123')) err.form = 'Invalid username or password.';
    setErrors(err);
    if (Object.keys(err).length) return;
    setAuthenticated(true);
    setP('');
    go('admin');
  };
  return (
    <div className="login-screen">
      <div className="login-photo"><Photo image={image('hero-image-1') || data.images[0]} priority /><div className="login-brand-copy"><div className="eyebrow">Admin Panel</div><h2>Manage your website,<br />beautifully.</h2></div></div>
      <div className="login-panel"><form className="login-box" noValidate onSubmit={submit}>
        <img className="login-logo" src={data.settings.logo} alt={`${data.settings.name} official logo`} />
        <h1>Admin Login</h1>
        <p className="body-copy">Sign in to manage website content for this session.</p>
        <Field label="Username" error={errors.u}><input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" /></Field>
        <Field label="Password" error={errors.p}><input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></Field>
        {errors.form && <p className="field-error mt-4" role="alert">{errors.form}</p>}
        <Button type="submit" icon="arrow">Sign In</Button>
        <div className="notice mt-6">Demo credentials — Username: <strong>admin</strong> · Password: <strong>Tisan@123</strong>. This is a front-end demonstration login, not secure authentication.</div>
        <Button variant="text" onClick={() => go('public')}>← Back to website</Button>
      </form></div>
    </div>
  );
}

/* ---------------- Dashboard shell ---------------- */
const modules = [
  ['dashboard', 'Dashboard', 'grid'], ['banners', 'Hero Banners', 'image'], ['projects', 'Projects', 'building'], ['services', 'Services', 'shield'],
  ['gallery', 'Gallery', 'image'], ['images', 'Image Management', 'image'], ['enquiries', 'Enquiries', 'mail'], ['testimonials', 'Testimonials', 'quote'],
  ['faqs', 'FAQs', 'search'], ['content', 'Website Content', 'edit'], ['settings', 'Site Settings', 'sun'],
];

export function AdminDashboard() {
  const { data, go, setAuthenticated } = useTisan();
  const [view, setView] = useState('dashboard');
  const [open, setOpen] = useState(false);
  const logout = () => { setAuthenticated(false); go('login'); };
  const current = modules.find((m) => m[0] === view);
  const pick = (v) => { setView(v); setOpen(false); window.scrollTo(0, 0); };
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? 'open' : ''}`} aria-label="Admin navigation">
        <img src={data.settings.logo} alt={`${data.settings.name} logo`} />
        <nav className="admin-nav">
          {modules.map(([id, label, icon]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => pick(id)} aria-current={view === id ? 'page' : undefined}><Icon name={icon} size={16} />{label}{id === 'enquiries' && data.enquiries.some((e) => e.status === 'New') && <span className="ml-auto text-secondary">●</span>}</button>)}
          <button onClick={logout}><Icon name="logout" size={16} />Logout</button>
        </nav>
      </aside>
      <div className="admin-main">
        <div className="admin-topbar">
          <div className="flex items-center"><button className="icon-btn mobile-toggle" aria-label={open ? 'Close admin menu' : 'Open admin menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)}><Icon name={open ? 'close' : 'menu'} /></button><div><h1>{current[1]}</h1><p>Demo admin · changes last for this session only</p></div></div>
          <Button variant="outline" icon="arrow" onClick={() => go('public')}>View Website</Button>
        </div>
        <div className="admin-workspace">
          {view === 'dashboard' && <Overview setView={pick} />}
          {view === 'banners' && <BannerManager />}
          {view === 'projects' && <ProjectsManager />}
          {view === 'services' && <ServicesManager />}
          {view === 'gallery' && <GalleryManager />}
          {view === 'images' && <ImageManager />}
          {view === 'enquiries' && <EnquiriesManager />}
          {view === 'testimonials' && <SimpleManager collKey="testimonials" title="Testimonials" what="testimonial" note="Use only clearly labelled sample testimonials. The website marks every entry as a demo, not a verified review." fields={[['name', 'Display name'], ['quote', 'Quote', true]]} blank={{ name: '', quote: '', published: true }} columns={[['name', 'Name'], ['quote', 'Quote']]} />}
          {view === 'faqs' && <SimpleManager collKey="faqs" title="FAQs" what="FAQ" note="Order here is the order shown on the website." fields={[['question', 'Question'], ['answer', 'Answer', true]]} blank={{ question: '', answer: '', published: true }} columns={[['question', 'Question'], ['answer', 'Answer']]} />}
          {view === 'content' && <ContentManager />}
          {view === 'settings' && <SettingsManager />}
        </div>
      </div>
      {open && <div className="modal-backdrop" style={{ zIndex: 60, background: 'transparent' }} onClick={() => setOpen(false)} aria-hidden="true" />}
    </div>
  );
}
