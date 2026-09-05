'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, FileJson, Download, Plus, Trash2, Edit2, X, Check, Loader } from 'lucide-react';

interface Lead {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  social: string;
  businessType: string;
  campaign: string;
  status: string;
  dateFound: string;
  notes: string;
}

interface Campaign {
  id: number;
  name: string;
  created: string;
}

export default function ResearchApp() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchMode, setSearchMode] = useState<'natural' | 'structured'>('natural');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Lead | {}>({});
  const [filters, setFilters] = useState({
    businessType: 'all',
    status: 'all',
    campaign: 'all',
  });

  const [naturalQuery, setNaturalQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [structured, setStructured] = useState({
    campaignName: '',
    businessType: '',
    geography: '',
    companySize: '',
    details: ''
  });

  const [stats, setStats] = useState({
    totalLeads: 0,
    totalSearches: 0,
    thisMonth: 0
  });

  useEffect(() => {
    const saved = localStorage.getItem('360Research');
    if (saved) {
      const data = JSON.parse(saved);
      setLeads(data.leads || []);
      setCampaigns(data.campaigns || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('360Research', JSON.stringify({ leads, campaigns }));
  }, [leads, campaigns]);

  const executeSearch = async () => {
    let query = naturalQuery;
    if (searchMode === 'structured' && structured.campaignName) {
      query = `${structured.businessType} in ${structured.geography}${structured.companySize ? ' (' + structured.companySize + ')' : ''}`;
    }

    if (!query.trim()) return;

    setIsSearching(true);

    try {
      // Add campaign if new
      if (searchMode === 'structured' && structured.campaignName && !campaigns.find(c => c.name === structured.campaignName)) {
        setCampaigns([...campaigns, { id: Date.now(), name: structured.campaignName, created: new Date().toLocaleDateString() }]);
      }

      // Call our API
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: naturalQuery,
          searchMode,
          structured,
        }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();

      if (data.leads && Array.isArray(data.leads)) {
        setLeads([...leads, ...data.leads]);
        setStats(s => ({
          totalLeads: s.totalLeads + data.leads.length,
          totalSearches: s.totalSearches + 1,
          thisMonth: s.thisMonth + data.leads.length
        }));
      }

      setNaturalQuery('');
      setStructured({ campaignName: '', businessType: '', geography: '', companySize: '', details: '' });
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const startEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setEditData({ ...lead });
  };

  const saveEdit = () => {
    setLeads(leads.map(l => l.id === editingId ? editData as Lead : l));
    setEditingId(null);
  };

  const deleteLead = (id: number) => {
    setLeads(leads.filter(l => l.id !== id));
  };

  const filteredLeads = leads.filter(l => {
    if (filters.businessType !== 'all' && l.businessType !== filters.businessType) return false;
    if (filters.status !== 'all' && l.status !== filters.status) return false;
    if (filters.campaign !== 'all' && l.campaign !== filters.campaign) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ['Email', 'Name', 'Phone', 'City', 'State', 'ZIP', 'Website', 'Social', 'Business Type', 'Campaign', 'Status', 'Date Found'];
    const rows = filteredLeads.map(l => [l.email, l.name, l.phone, l.city, l.state, l.zip, l.website, l.social, l.businessType, l.campaign, l.status, l.dateFound]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `360research-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportJSON = () => {
    const data = { exportDate: new Date().toISOString(), leads: filteredLeads, campaignMetadata: campaigns };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `360research-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const businessTypes = [...new Set(leads.map(l => l.businessType))];
  const statuses = ['New', 'Contacted', 'Qualified', 'Negotiating'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-white">360 Research</h1>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-8">
          <div className="flex gap-3 mb-6">
            <button onClick={() => setSearchMode('natural')} className={`flex-1 py-2 px-4 rounded-lg border transition ${searchMode === 'natural' ? 'bg-slate-800 border-blue-500' : 'border-slate-700'}`}>
              Natural language
            </button>
            <button onClick={() => setSearchMode('structured')} className={`flex-1 py-2 px-4 rounded-lg border transition ${searchMode === 'structured' ? 'bg-slate-800 border-blue-500' : 'border-slate-700'}`}>
              Structured search
            </button>
          </div>

          {searchMode === 'natural' ? (
            <div>
              <label className="block text-sm text-slate-400 mb-2">What are you looking for?</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., dental clinics in California, insurance agencies Texas..."
                  value={naturalQuery}
                  onChange={(e) => setNaturalQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && executeSearch()}
                  disabled={isSearching}
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 disabled:opacity-50"
                />
                <button onClick={executeSearch} disabled={isSearching} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50">
                  {isSearching ? <Loader size={18} className="animate-spin" /> : <Search size={18} />} {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Campaign name</label>
                  <input type="text" placeholder="e.g., CA Dental Q4 2026" value={structured.campaignName} onChange={(e) => setStructured({...structured, campaignName: e.target.value})} disabled={isSearching} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Business type</label>
                  <input type="text" placeholder="e.g., Dental Clinics" value={structured.businessType} onChange={(e) => setStructured({...structured, businessType: e.target.value})} disabled={isSearching} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Geography</label>
                  <input type="text" placeholder="e.g., California, USA" value={structured.geography} onChange={(e) => setStructured({...structured, geography: e.target.value})} disabled={isSearching} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Company size</label>
                  <input type="text" placeholder="e.g., 1-5, 5-50, 50+" value={structured.companySize} onChange={(e) => setStructured({...structured, companySize: e.target.value})} disabled={isSearching} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm disabled:opacity-50" />
                </div>
              </div>
              <button onClick={executeSearch} disabled={isSearching} className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {isSearching ? <Loader size={18} className="animate-spin" /> : <Search size={18} />} {isSearching ? 'Searching...' : 'Execute search'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-2">Total leads</div>
            <div className="text-3xl font-bold">{stats.totalLeads}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-2">Searches</div>
            <div className="text-3xl font-bold">{stats.totalSearches}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-2">This month</div>
            <div className="text-3xl font-bold">{stats.thisMonth}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <select value={filters.businessType} onChange={(e) => setFilters({...filters, businessType: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm">
            <option value="all">All Business Types</option>
            {businessTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm">
            <option value="all">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.campaign} onChange={(e) => setFilters({...filters, campaign: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 text-sm">
            <option value="all">All Campaigns</option>
          </select>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-sm font-semibold flex items-center justify-center gap-1">
              <Download size={14} /> CSV
            </button>
            <button onClick={exportJSON} className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-sm font-semibold flex items-center justify-center gap-1">
              <FileJson size={14} /> JSON
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-semibold">Name</th>
                <th className="text-left px-4 py-3 text-slate-400 font-semibold">Email</th>
                <th className="text-left px-4 py-3 text-slate-400 font-semibold">Phone</th>
                <th className="text-left px-4 py-3 text-slate-400 font-semibold">City, State</th>
                <th className="text-left px-4 py-3 text-slate-400 font-semibold">Business Type</th>
                <th className="text-left px-4 py-3 text-slate-400 font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">No leads found. Start a search above.</td>
                </tr>
              ) : (
                filteredLeads.map(lead => (
                  <tr key={lead.id} className="border-b border-slate-700 hover:bg-slate-800">
                    {editingId === lead.id ? (
                      <>
                        <td className="px-4 py-3"><input type="text" value={(editData as Lead).name} onChange={(e) => setEditData({...editData as Lead, name: e.target.value})} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm" /></td>
                        <td className="px-4 py-3"><input type="text" value={(editData as Lead).email} onChange={(e) => setEditData({...editData as Lead, email: e.target.value})} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm" /></td>
                        <td className="px-4 py-3"><input type="text" value={(editData as Lead).phone} onChange={(e) => setEditData({...editData as Lead, phone: e.target.value})} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm" /></td>
                        <td className="px-4 py-3"><input type="text" value={`${(editData as Lead).city}, ${(editData as Lead).state}`} onChange={(e) => { const [c, s] = e.target.value.split(', '); setEditData({...editData as Lead, city: c, state: s}); }} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm" /></td>
                        <td className="px-4 py-3"><input type="text" value={(editData as Lead).businessType} onChange={(e) => setEditData({...editData as Lead, businessType: e.target.value})} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm" /></td>
                        <td className="px-4 py-3"><select value={(editData as Lead).status} onChange={(e) => setEditData({...editData as Lead, status: e.target.value})} className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm">
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select></td>
                        <td className="px-4 py-3 flex gap-1">
                          <button onClick={saveEdit} className="p-1 bg-green-600 hover:bg-green-700 rounded"><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 bg-red-600 hover:bg-red-700 rounded"><X size={14} /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">{lead.name}</td>
                        <td className="px-4 py-3 text-blue-400">{lead.email}</td>
                        <td className="px-4 py-3">{lead.phone}</td>
                        <td className="px-4 py-3">{lead.city}, {lead.state}</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs">{lead.businessType}</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${lead.status === 'New' ? 'bg-yellow-900 text-yellow-200' : lead.status === 'Contacted' ? 'bg-blue-900 text-blue-200' : 'bg-green-900 text-green-200'}`}>{lead.status}</span></td>
                        <td className="px-4 py-3 flex gap-1">
                          <button onClick={() => startEdit(lead)} className="p-1 bg-slate-700 hover:bg-slate-600 rounded"><Edit2 size={14} /></button>
                          <button onClick={() => deleteLead(lead.id)} className="p-1 bg-slate-700 hover:bg-red-600 rounded text-red-400"><Trash2 size={14} /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}