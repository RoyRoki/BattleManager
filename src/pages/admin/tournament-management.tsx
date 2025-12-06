import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { Tournament, TournamentStatus, PlayerKill } from '../../types';
import { tournamentSchema } from '../../utils/validations';
import { encryptCredentials, decryptCredentials } from '../../utils/encryptCredentials';
import { useFirestoreTransaction } from '../../hooks/useFirestoreTransaction';
import { uploadImage } from '../../services/cloudinaryService';
import { getSuggestedTournamentStatus } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiUsers, HiPhotograph, HiFilter, HiExclamationCircle, HiClipboardCopy, HiLink, HiChevronDown, HiCheck, HiOutlineFire, HiEye, HiEyeOff, HiSearch, HiCurrencyDollar, HiLockClosed } from 'react-icons/hi';

export const TournamentManagement: React.FC = () => {
  const [tournaments, loading, error] = useCollection(
    collection(firestore, 'tournaments')
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];
  
  // Log errors for debugging
  if (error) {
    console.error('TournamentManagement: Firestore error:', error);
  }
  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'all'>('all');
  const [showEnrolledPlayers, setShowEnrolledPlayers] = useState<string | null>(null);
  const [showKillList, setShowKillList] = useState<Tournament | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [openInlineDropdown, setOpenInlineDropdown] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entry_amount: '',
    max_players: '',
    start_time: '',
    reveal_time: '',
    ff_id: '',
    ff_password: '',
    status: 'upcoming' as TournamentStatus,
    banner_url: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tournamentData = tournamentSchema.parse({
        name: formData.name,
        description: formData.description || undefined,
        entry_amount: parseFloat(formData.entry_amount),
        max_players: parseInt(formData.max_players),
        start_time: new Date(formData.start_time),
        reveal_time: formData.reveal_time ? new Date(formData.reveal_time) : undefined,
        banner_url: formData.banner_url || undefined,
      });

      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@battlemanager.com';

      if (editingTournament) {
        const updateData: any = {
          ...tournamentData,
          status: formData.status,
          updated_at: new Date(),
        };

        // Only update credentials if provided
        if (formData.ff_id) {
          updateData.ff_id_encrypted = encryptCredentials(formData.ff_id);
        }
        if (formData.ff_password) {
          updateData.ff_password_encrypted = encryptCredentials(formData.ff_password);
        }

        await updateDoc(doc(firestore, 'tournaments', editingTournament.id), updateData);
        toast.success('Tournament updated!');
      } else {
        const ffIdEncrypted = formData.ff_id
          ? encryptCredentials(formData.ff_id)
          : undefined;
        const ffPasswordEncrypted = formData.ff_password
          ? encryptCredentials(formData.ff_password)
          : undefined;

        await addDoc(collection(firestore, 'tournaments'), {
          ...tournamentData,
          current_players: 0,
          status: formData.status,
          created_by: adminEmail,
          ff_id_encrypted: ffIdEncrypted,
          ff_password_encrypted: ffPasswordEncrypted,
          created_at: new Date(),
          updated_at: new Date(),
        });
        toast.success('Tournament created!');
      }

      setShowForm(false);
      setEditingTournament(null);
      setFormData({
        name: '',
        description: '',
        entry_amount: '',
        max_players: '',
        start_time: '',
        reveal_time: '',
        ff_id: '',
        ff_password: '',
        status: 'upcoming',
        banner_url: '',
      });
      setShowPassword(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save tournament');
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingBanner(true);
    try {
      const url = await uploadImage(file, 'tournaments/banners');
      setFormData({ ...formData, banner_url: url });
      toast.success('Banner uploaded successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleStatusChange = async (tournamentId: string, newStatus: TournamentStatus) => {
    try {
      await updateDoc(doc(firestore, 'tournaments', tournamentId), {
        status: newStatus,
        updated_at: new Date(),
      });
      toast.success(`Tournament status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update tournament status');
    }
  };

  const filteredTournaments = useMemo(() => {
    if (!tournaments?.docs) return [];
    
    const allTournaments = tournaments.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        start_time:
          data.start_time instanceof Date
            ? data.start_time
            : (data.start_time as any)?.toDate?.() || new Date(),
        reveal_time:
          data.reveal_time instanceof Date
            ? data.reveal_time
            : (data.reveal_time as any)?.toDate?.() || undefined,
        created_at:
          data.created_at instanceof Date
            ? data.created_at
            : (data.created_at as any)?.toDate?.() || new Date(),
        updated_at:
          data.updated_at instanceof Date
            ? data.updated_at
            : (data.updated_at as any)?.toDate?.() || new Date(),
      } as Tournament;
    });

    if (statusFilter === 'all') {
      return allTournaments.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }

    return allTournaments
      .filter((t) => t.status === statusFilter)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }, [tournaments, statusFilter]);

  const handleEdit = (tournament: Tournament) => {
    setEditingTournament(tournament);
    
    // Decrypt credentials if they exist
    let ffId = '';
    let ffPassword = '';
    
    if (tournament.ff_id_encrypted) {
      try {
        ffId = decryptCredentials(tournament.ff_id_encrypted);
      } catch (error) {
        console.error('Failed to decrypt FF-ID:', error);
      }
    }
    
    if (tournament.ff_password_encrypted) {
      try {
        ffPassword = decryptCredentials(tournament.ff_password_encrypted);
      } catch (error) {
        console.error('Failed to decrypt FF-Password:', error);
      }
    }
    
    setFormData({
      name: tournament.name,
      description: tournament.description || '',
      entry_amount: tournament.entry_amount.toString(),
      max_players: tournament.max_players.toString(),
      start_time: new Date(tournament.start_time).toISOString().slice(0, 16),
      reveal_time: tournament.reveal_time
        ? new Date(tournament.reveal_time).toISOString().slice(0, 16)
        : '',
      ff_id: ffId,
      ff_password: ffPassword,
      status: tournament.status,
      banner_url: tournament.banner_url || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;

    try {
      await deleteDoc(doc(firestore, 'tournaments', id));
      toast.success('Tournament deleted!');
    } catch (error) {
      toast.error('Failed to delete tournament');
    }
  };

  // Compute effective status based on reveal_time
  const getEffectiveStatus = (tournament: Tournament): TournamentStatus => {
    // If manually set to completed or cancelled, respect that
    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      return tournament.status;
    }
    
    // If reveal_time has passed and status is upcoming, show as live
    if (tournament.status === 'upcoming' && tournament.reveal_time) {
      const now = new Date();
      if (now >= new Date(tournament.reveal_time)) {
        return 'live';
      }
    }
    
    return tournament.status;
  };

  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case 'upcoming':
        return 'bg-orange-900 text-orange-300';
      case 'live':
        return 'bg-green-900 text-green-300';
      case 'completed':
        return 'bg-blue-900 text-blue-300';
      case 'cancelled':
        return 'bg-red-900 text-red-300';
      default:
        return 'bg-gray-800 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        {/* Error Message */}
        {error && (
          <div className="bg-accent bg-opacity-20 border border-accent rounded-lg p-4 mb-6">
            <p className="text-accent font-body">
              ⚠️ Unable to load tournament data. Please check your connection and refresh the page.
            </p>
            <p className="text-xs text-gray-400 mt-2">Error: {error.message || 'Unknown error'}</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-heading text-primary text-glow">
            Tournament Management
          </h1>
          <div className="flex gap-2">
          <button
            onClick={() => {
              setShowForm(true);
              setEditingTournament(null);
                setFormData({
                  name: '',
                  description: '',
                  entry_amount: '',
                  max_players: '',
                  start_time: '',
                  reveal_time: '',
                  ff_id: '',
                  ff_password: '',
                  status: 'upcoming',
                  banner_url: '',
                });
                setShowPassword(false);
            }}
            className="bg-primary text-bg px-6 py-2 rounded-lg font-heading hover:bg-opacity-80 transition"
          >
            + New Tournament
          </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <HiFilter className="text-primary" />
            <span className="text-gray-400">Filter by Status:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'upcoming', 'live', 'completed', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-heading transition ${
                  statusFilter === status
                    ? 'bg-primary text-bg'
                    : 'bg-bg-secondary text-gray-400 hover:bg-opacity-80'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
        {showForm && (
          <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            className="bg-bg-secondary border border-primary rounded-lg p-6 mb-6"
          >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-heading text-primary">
              {editingTournament ? 'Edit Tournament' : 'Create Tournament'}
            </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingTournament(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Tournament Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Entry Amount (Points)</label>
                  <input
                    type="number"
                    value={formData.entry_amount}
                    onChange={(e) => setFormData({ ...formData, entry_amount: e.target.value })}
                    className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    min="10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Max Players</label>
                  <input
                    type="number"
                    value={formData.max_players}
                    onChange={(e) => setFormData({ ...formData, max_players: e.target.value })}
                    className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    min="2"
                    required
                  />
                </div>
              </div>
                <div>
                  <label className="block text-sm mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Reveal Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.reveal_time}
                    onChange={(e) => setFormData({ ...formData, reveal_time: e.target.value })}
                    className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Status</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          formData.status === 'upcoming' ? 'bg-orange-400' :
                          formData.status === 'live' ? 'bg-green-400 animate-pulse' :
                          formData.status === 'completed' ? 'bg-blue-400' :
                          'bg-red-400'
                        }`} />
                        <span className="capitalize">{formData.status}</span>
              </div>
                      <HiChevronDown className={`w-5 h-5 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showStatusDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-1 bg-bg-secondary border border-gray-700 rounded-lg overflow-hidden shadow-lg"
                        >
                          {(['upcoming', 'live', 'completed', 'cancelled'] as TournamentStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, status });
                                setShowStatusDropdown(false);
                              }}
                              className={`w-full px-4 py-3 flex items-center justify-between hover:bg-bg transition ${
                                formData.status === status ? 'bg-bg' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full ${
                                  status === 'upcoming' ? 'bg-orange-400' :
                                  status === 'live' ? 'bg-green-400' :
                                  status === 'completed' ? 'bg-blue-400' :
                                  'bg-red-400'
                                }`} />
                                <span className="capitalize">{status}</span>
                              </div>
                              {formData.status === status && (
                                <HiCheck className="w-5 h-5 text-primary" />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {formData.reveal_time && formData.status === 'upcoming' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-switches to Live when reveal time passes
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-2">Banner Image</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      disabled={uploadingBanner}
                      className="hidden"
                      id="banner-upload"
                    />
                    <label
                      htmlFor="banner-upload"
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 cursor-pointer hover:border-primary transition ${
                        uploadingBanner ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <HiPhotograph className="w-5 h-5" />
                      {uploadingBanner ? 'Uploading...' : 'Upload Banner'}
                    </label>
                    {formData.banner_url && (
                      <div className="flex-1">
                        <img
                          src={formData.banner_url}
                          alt="Banner preview"
                          className="h-20 w-auto rounded-lg object-cover"
                  />
                </div>
              )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">
                      FF-ID {editingTournament ? '(Leave empty to keep existing)' : '(Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.ff_id}
                      onChange={(e) => setFormData({ ...formData, ff_id: e.target.value })}
                      className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                      placeholder="Free Fire ID (will be encrypted)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      FF-Password {editingTournament ? '(Leave empty to keep existing)' : '(Optional)'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.ff_password}
                        onChange={(e) => setFormData({ ...formData, ff_password: e.target.value })}
                        className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:border-primary"
                        placeholder="Free Fire Password (will be encrypted)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                      >
                        {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-bg py-2 rounded-lg font-heading hover:bg-opacity-80 transition"
                >
                  {editingTournament ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTournament(null);
                  }}
                  className="flex-1 bg-bg-tertiary text-white py-2 rounded-lg hover:bg-opacity-80 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
        </AnimatePresence>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading tournaments...</div>
        ) : filteredTournaments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No tournaments found</p>
            <p className="text-gray-500 text-sm mt-2">
              {statusFilter !== 'all' ? `No ${statusFilter} tournaments` : 'Create your first tournament'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTournaments.map((tournament) => (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-secondary border border-gray-800 rounded-lg p-4 hover:border-primary transition"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {tournament.banner_url && (
                    <div className="md:w-32 h-32 flex-shrink-0">
                      <img
                        src={tournament.banner_url}
                        alt={tournament.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-heading text-primary">{tournament.name}</h3>
                          {(() => {
                            const suggestedStatus = getSuggestedTournamentStatus(
                              tournament.start_time,
                              tournament.status
                            );
                            if (suggestedStatus !== tournament.status && tournament.status !== 'cancelled') {
              return (
                                <div className="flex items-center gap-1 text-yellow-400 text-xs" title={`Suggested status: ${suggestedStatus}`}>
                                  <HiExclamationCircle className="w-4 h-4" />
                                  <span className="hidden md:inline">Update to {suggestedStatus}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        {tournament.description && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {tournament.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-3 py-1 rounded text-xs font-heading ${getStatusColor(getEffectiveStatus(tournament))}`}>
                          {getEffectiveStatus(tournament).toUpperCase()}
                        </span>
                        {getEffectiveStatus(tournament) !== tournament.status && (
                          <span className="text-[10px] text-gray-500">
                            (was: {tournament.status})
                          </span>
                        )}
                      </div>
                    </div>
                    {/* T-Link for Banner */}
                    <div className="flex items-center gap-2 mb-3 p-2 bg-bg rounded-lg border border-gray-700">
                      <HiLink className="w-4 h-4 text-primary flex-shrink-0" />
                      <code className="text-xs text-gray-300 flex-1 truncate">/tournament/{tournament.id}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`/tournament/${tournament.id}`);
                          toast.success('T-Link copied!');
                        }}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                        title="Copy T-Link for banner"
                      >
                        <HiClipboardCopy className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <p className="text-xs text-gray-400">Entry Fee</p>
                        <p className="text-sm text-white">{tournament.entry_amount} pts</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Players</p>
                        <p className="text-sm text-white">
                          {tournament.current_players}/{tournament.max_players}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Start Time</p>
                        <p className="text-xs text-white">
                        {new Date(tournament.start_time).toLocaleString()}
                      </p>
                    </div>
                      {tournament.reveal_time && (
                        <div>
                          <p className="text-xs text-gray-400">Reveal Time</p>
                          <p className="text-xs text-white">
                            {new Date(tournament.reveal_time).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(tournament)}
                        className="bg-primary text-bg px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setShowEnrolledPlayers(tournament.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition flex items-center gap-2"
                      >
                        <HiUsers className="w-4 h-4" />
                        View Players ({tournament.current_players})
                      </button>
                      {(tournament.status === 'completed' || getEffectiveStatus(tournament) === 'completed') && (
                        <button
                          onClick={() => setShowKillList(tournament)}
                          className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition flex items-center gap-2"
                        >
                          <HiOutlineFire className="w-4 h-4" />
                          Kill List
                        </button>
                      )}
                      <div className="relative">
                        <button
                          onClick={() => setOpenInlineDropdown(openInlineDropdown === tournament.id ? null : tournament.id)}
                          className="bg-bg border border-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:border-primary transition flex items-center gap-2"
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            tournament.status === 'upcoming' ? 'bg-orange-400' :
                            tournament.status === 'live' ? 'bg-green-400' :
                            tournament.status === 'completed' ? 'bg-blue-400' :
                            'bg-red-400'
                          }`} />
                          <span className="capitalize">{tournament.status}</span>
                          <HiChevronDown className={`w-4 h-4 transition-transform ${openInlineDropdown === tournament.id ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {openInlineDropdown === tournament.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-50 w-40 mt-1 bg-bg-secondary border border-gray-700 rounded-lg overflow-hidden shadow-lg"
                            >
                              {(['upcoming', 'live', 'completed', 'cancelled'] as TournamentStatus[]).map((status) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    handleStatusChange(tournament.id, status);
                                    setOpenInlineDropdown(null);
                                  }}
                                  className={`w-full px-4 py-2 flex items-center justify-between hover:bg-bg transition text-sm ${
                                    tournament.status === status ? 'bg-bg' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                      status === 'upcoming' ? 'bg-orange-400' :
                                      status === 'live' ? 'bg-green-400' :
                                      status === 'completed' ? 'bg-blue-400' :
                                      'bg-red-400'
                                    }`} />
                                    <span className="capitalize">{status}</span>
                                  </div>
                                  {tournament.status === status && (
                                    <HiCheck className="w-4 h-4 text-primary" />
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <button
                        onClick={() => handleDelete(tournament.id)}
                        className="bg-accent text-white px-4 py-2 rounded-lg text-sm hover:bg-opacity-80 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Enrolled Players Modal */}
        <AnimatePresence>
          {showEnrolledPlayers && (
            <EnrolledPlayersModal
              tournamentId={showEnrolledPlayers}
              onClose={() => setShowEnrolledPlayers(null)}
            />
          )}
        </AnimatePresence>

        {/* Kill List Full Page */}
        {showKillList && (
          <KillListPage
            tournament={showKillList}
            onClose={() => setShowKillList(null)}
          />
        )}
                  </div>
                </div>
              );
};

// Enrolled Players Modal Component
interface EnrolledPlayersModalProps {
  tournamentId: string;
  onClose: () => void;
}

const EnrolledPlayersModal: React.FC<EnrolledPlayersModalProps> = ({ tournamentId, onClose }) => {
  const [users, loading] = useCollection(
    collection(firestore, 'users')
  ) as unknown as [{ docs: any[] } | null, boolean];

  const enrolledUsers = useMemo(() => {
    if (!users?.docs) return [];
    return users.docs
      .filter((doc) => {
        const data = doc.data();
        return data.enrolled_tournaments?.includes(tournamentId);
      })
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          mobile_no: data.mobile_no,
          name: data.name || 'Unknown',
          ff_id: data.ff_id || 'N/A',
          points: data.points || 0,
          avatar_url: data.avatar_url,
        };
      });
  }, [users, tournamentId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-secondary border border-primary rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-heading text-primary">Enrolled Players</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading players...</div>
        ) : enrolledUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No players enrolled yet</div>
        ) : (
          <div className="space-y-2">
            {enrolledUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-bg border border-gray-800 rounded-lg p-4 flex items-center gap-4"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-bg font-heading">
                    {user.name.charAt(0).toUpperCase()}
          </div>
        )}
                <div className="flex-1">
                  <p className="text-white font-heading">{user.name}</p>
                  <p className="text-sm text-gray-400">Mobile: {user.mobile_no}</p>
                  <p className="text-xs text-gray-500">FF ID: {user.ff_id}</p>
      </div>
                <div className="text-right">
                  <p className="text-sm text-primary">{user.points} pts</p>
    </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Kill List Full Page Component
interface KillListPageProps {
  tournament: Tournament;
  onClose: () => void;
}

const KillListPage: React.FC<KillListPageProps> = ({ tournament, onClose }) => {
  const [users, loading] = useCollection(
    collection(firestore, 'users')
  ) as unknown as [{ docs: any[] } | null, boolean];
  const [killCounts, setKillCounts] = useState<Record<string, number>>({});
  const [customCredits, setCustomCredits] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [pointsPerKill, setPointsPerKill] = useState(10);
  const [showCustomCreditModal, setShowCustomCreditModal] = useState<string | null>(null);
  const [showCreditConfirmModal, setShowCreditConfirmModal] = useState<string | null>(null);
  const [showPayAllConfirmModal, setShowPayAllConfirmModal] = useState(false);
  const [customCreditAmount, setCustomCreditAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { addPoints } = useFirestoreTransaction();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@battlemanager.com';

  const enrolledUsers = useMemo(() => {
    if (!users?.docs) return [];
    let filtered = users.docs
      .filter((doc) => {
        const data = doc.data();
        return data.enrolled_tournaments?.includes(tournament.id);
      })
      .map((doc) => {
        const data = doc.data();
        const existingKills = tournament.player_kills?.[data.mobile_no]?.kills || 0;
        const pointsCredited = tournament.player_kills?.[data.mobile_no]?.points_credited || 0;
        const customCredit = customCredits[data.mobile_no] || tournament.payment_info?.custom_credits?.[data.mobile_no] || 0;
        return {
          id: doc.id,
          mobile_no: data.mobile_no,
          name: data.name || 'Unknown',
          ff_id: data.ff_id || 'N/A',
          avatar_url: data.avatar_url,
          existingKills,
          pointsCredited,
          customCredit,
        };
      });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.ff_id.toLowerCase().includes(query)
      );
    }

    // Sort by kills (highest first)
    return filtered.sort((a, b) => {
      const killsA = killCounts[a.mobile_no] ?? a.existingKills;
      const killsB = killCounts[b.mobile_no] ?? b.existingKills;
      return killsB - killsA;
    });
  }, [users, tournament.id, tournament.player_kills, killCounts, searchQuery, customCredits]);

  // Initialize kill counts and custom credits from existing data
  React.useEffect(() => {
    if (tournament.player_kills) {
      const initialKills: Record<string, number> = {};
      Object.entries(tournament.player_kills).forEach(([mobile, data]) => {
        initialKills[mobile] = data.kills;
      });
      setKillCounts(initialKills);
    }
    if (tournament.payment_info?.custom_credits) {
      setCustomCredits(tournament.payment_info.custom_credits);
    }
    if (tournament.payment_info?.points_per_kill) {
      setPointsPerKill(tournament.payment_info.points_per_kill);
    }
  }, [tournament.player_kills, tournament.payment_info]);

  const handleKillChange = (mobile: string, kills: number) => {
    // Check if payment has been made
    if (tournament.payment_info?.paid_at) {
      toast.error('Cannot edit kill list after payment has been made!');
      return;
    }
    setKillCounts((prev) => ({
      ...prev,
      [mobile]: Math.max(0, kills),
    }));
    setHasChanges(true);
  };

  const handleCustomCredit = async (mobile: string, amount: number) => {
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const user = enrolledUsers.find((u) => u.mobile_no === mobile);
    if (!user) return;

    // Check if payment has been made
    if (tournament.payment_info?.paid_at) {
      toast.error('Cannot credit points after payment has been made!');
      return;
    }

    setShowCustomCreditModal(null);
    setPaying(true);

    try {
      // Credit points immediately
      const success = await addPoints(mobile, amount);
      if (!success) {
        toast.error('Failed to credit points');
        return;
      }

      // Update custom credits
      setCustomCredits((prev) => ({
        ...prev,
        [mobile]: amount,
      }));

      // Update tournament payment info
      const existingKills = tournament.player_kills || {};
      const kills = killCounts[mobile] ?? user.existingKills;
      const updatedKills = {
        ...existingKills,
        [mobile]: {
          ...existingKills[mobile],
          kills: kills,
          points_credited: amount,
          credited_at: new Date(),
        },
      };

      await updateDoc(doc(firestore, 'tournaments', tournament.id), {
        player_kills: updatedKills,
        updated_at: new Date(),
      });

      // Create payment record for tournament winning
      await addDoc(collection(firestore, 'payments'), {
        user_mobile: mobile,
        user_name: user.name || 'Unknown',
        amount: amount,
        type: 'tournament_winning',
        status: 'approved',
        tournament_id: tournament.id,
        tournament_name: tournament.name,
        approved_by: adminEmail,
        approved_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      toast.success(`Credited ${amount} custom points to ${user.name}`);
      setCustomCreditAmount('');
      setHasChanges(false);

      // Refresh page after successful credit
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error crediting custom points:', error);
      toast.error('Failed to credit custom points');
    } finally {
      setPaying(false);
    }
  };

  const calculatePoints = (kills: number, mobile: string): number => {
    const custom = customCredits[mobile] || tournament.payment_info?.custom_credits?.[mobile] || 0;
    if (custom > 0) return custom;
    return kills * pointsPerKill;
  };

  const handleSave = async () => {
    // Check if payment has been made
    if (tournament.payment_info?.paid_at) {
      toast.error('Cannot edit kill list after payment has been made!');
      return;
    }

    setSaving(true);
    try {
      const playerKills: Record<string, PlayerKill> = {};
      
      enrolledUsers.forEach((user) => {
        const kills = killCounts[user.mobile_no] ?? user.existingKills;
        const existingData = tournament.player_kills?.[user.mobile_no];
        playerKills[user.mobile_no] = {
          kills,
          updated_at: new Date(),
          // Preserve existing payment info
          points_credited: existingData?.points_credited,
          credited_at: existingData?.credited_at,
        };
      });

      await updateDoc(doc(firestore, 'tournaments', tournament.id), {
        player_kills: playerKills,
        updated_at: new Date(),
      });

      toast.success('Kill list updated successfully!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving kill list:', error);
      toast.error('Failed to save kill list');
    } finally {
      setSaving(false);
    }
  };

  const handlePayIndividual = async (mobile: string) => {
    const user = enrolledUsers.find((u) => u.mobile_no === mobile);
    if (!user) return;

    const kills = killCounts[mobile] ?? user.existingKills;
    const pointsToCredit = calculatePoints(kills, mobile);

    if (pointsToCredit <= 0) {
      toast.error('No points to credit');
      return;
    }

    // Show confirmation modal
    setShowCreditConfirmModal(mobile);
  };

  const confirmPayIndividual = async (mobile: string) => {
    const user = enrolledUsers.find((u) => u.mobile_no === mobile);
    if (!user) return;

    const kills = killCounts[mobile] ?? user.existingKills;
    const pointsToCredit = calculatePoints(kills, mobile);

    setShowCreditConfirmModal(null);
    setPaying(true);
    try {
      // Credit points
      const success = await addPoints(mobile, pointsToCredit);
      if (!success) {
        toast.error('Failed to credit points');
        return;
      }

      // Update tournament payment info
      const existingKills = tournament.player_kills || {};
      const updatedKills = {
        ...existingKills,
        [mobile]: {
          ...existingKills[mobile],
          kills: kills,
          points_credited: pointsToCredit,
          credited_at: new Date(),
        },
      };

      await updateDoc(doc(firestore, 'tournaments', tournament.id), {
        player_kills: updatedKills,
        updated_at: new Date(),
      });

      // Create payment record for tournament winning
      await addDoc(collection(firestore, 'payments'), {
        user_mobile: mobile,
        user_name: user.name || 'Unknown',
        amount: pointsToCredit,
        type: 'tournament_winning',
        status: 'approved',
        tournament_id: tournament.id,
        tournament_name: tournament.name,
        approved_by: adminEmail,
        approved_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      toast.success(`Credited ${pointsToCredit} points to ${user.name}`);
      
      // Refresh page after successful credit
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error crediting points:', error);
      toast.error('Failed to credit points');
    } finally {
      setPaying(false);
    }
  };

  const handlePayAll = () => {
    if (totalPointsToPay === 0) return;
    setShowPayAllConfirmModal(true);
  };

  const confirmPayAll = async () => {
    setShowPayAllConfirmModal(false);
    setPaying(true);
    try {
      let totalPaid = 0;
      const updatedKills: Record<string, PlayerKill> = {};
      const customCreditsToSave: Record<string, number> = {};

      for (const user of enrolledUsers) {
        const kills = killCounts[user.mobile_no] ?? user.existingKills;
        const pointsToCredit = calculatePoints(kills, user.mobile_no);

        if (pointsToCredit > 0) {
          // Credit points
          const success = await addPoints(user.mobile_no, pointsToCredit);
          if (success) {
            totalPaid += pointsToCredit;
            updatedKills[user.mobile_no] = {
              kills,
              updated_at: new Date(),
              points_credited: pointsToCredit,
              credited_at: new Date(),
            };
          }

          // Save custom credits if any
          const custom = customCredits[user.mobile_no];
          if (custom) {
            customCreditsToSave[user.mobile_no] = custom;
          }
        }
      }

      // Update tournament with payment info
      await updateDoc(doc(firestore, 'tournaments', tournament.id), {
        player_kills: {
          ...tournament.player_kills,
          ...updatedKills,
        },
        payment_info: {
          points_per_kill: pointsPerKill,
          total_paid: totalPaid,
          paid_at: new Date(),
          paid_by: adminEmail,
          custom_credits: Object.keys(customCreditsToSave).length > 0 ? customCreditsToSave : undefined,
        },
        updated_at: new Date(),
      });

      // Create payment records for all tournament winnings
      for (const user of enrolledUsers) {
        const kills = killCounts[user.mobile_no] ?? user.existingKills;
        const pointsToCredit = calculatePoints(kills, user.mobile_no);
        
        if (pointsToCredit > 0 && updatedKills[user.mobile_no]) {
          await addDoc(collection(firestore, 'payments'), {
            user_mobile: user.mobile_no,
            user_name: user.name || 'Unknown',
            amount: pointsToCredit,
            type: 'tournament_winning',
            status: 'approved',
            tournament_id: tournament.id,
            tournament_name: tournament.name,
            approved_by: adminEmail,
            approved_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      toast.success(`Credited points to all players! Total: ${totalPaid} points`);
      setHasChanges(false);
      
      // Refresh page after successful credit
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error crediting points:', error);
      toast.error('Failed to credit points');
    } finally {
      setPaying(false);
    }
  };

  const totalKills = useMemo(() => {
    return enrolledUsers.reduce((sum, user) => {
      return sum + (killCounts[user.mobile_no] ?? user.existingKills);
    }, 0);
  }, [enrolledUsers, killCounts]);

  const totalPointsToPay = useMemo(() => {
    return enrolledUsers.reduce((sum, user) => {
      const kills = killCounts[user.mobile_no] ?? user.existingKills;
      const points = calculatePoints(kills, user.mobile_no);
      // Only count if not already paid
      if (!user.pointsCredited) {
        return sum + points;
      }
      return sum;
    }, 0);
  }, [enrolledUsers, killCounts, pointsPerKill, customCredits]);

  const isPaymentMade = !!tournament.payment_info?.paid_at;
  const isLocked = isPaymentMade && hasChanges;

  return (
    <div className="fixed inset-0 bg-bg z-50 overflow-hidden flex flex-col">
      <div className="container mx-auto px-4 py-4 md:py-6 flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 md:mb-6 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-heading text-orange-400 flex items-center gap-2">
              <HiOutlineFire className="w-8 h-8" />
              Kill List
            </h1>
            <p className="text-gray-400 mt-1">{tournament.name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-secondary border border-gray-800 hover:border-primary transition-colors"
          >
            <HiX className="w-6 h-6 text-primary" />
          </button>
        </div>

        {/* Warning if payment made */}
        {isPaymentMade && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6 flex items-center gap-3"
          >
            <HiExclamationCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-yellow-300 font-heading">Payment Already Made</p>
              <p className="text-yellow-400 text-sm mt-1">
                Points have been credited. Editing kill list is disabled to prevent conflicts.
                {isLocked && (
                  <span className="block mt-2 text-red-400">
                    <HiLockClosed className="inline w-4 h-4 mr-1" />
                    You have unsaved changes. Please discard changes or contact support.
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* Stats and Controls Bar */}
        <div className="bg-bg-secondary border border-gray-800 rounded-lg p-3 md:p-4 mb-4 md:mb-6 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
            <div>
              <span className="text-gray-400 text-sm">Total Players</span>
              <p className="text-white font-heading text-lg">{enrolledUsers.length}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Total Kills</span>
              <p className="text-orange-400 font-heading text-lg">{totalKills}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Points Per Kill</span>
              <input
                type="number"
                value={pointsPerKill}
                onChange={(e) => setPointsPerKill(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isPaymentMade}
                className="w-full bg-bg border border-gray-700 rounded px-2 py-1 text-primary font-heading focus:outline-none focus:border-primary disabled:opacity-50"
                min="1"
              />
            </div>
            <div>
              <span className="text-gray-400 text-sm">Total to Pay</span>
              <p className="text-green-400 font-heading text-lg">{totalPointsToPay} pts</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or FF ID..."
              className="w-full bg-bg border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4 md:mb-6 flex-wrap flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges || isPaymentMade}
            className={`px-6 py-2 rounded-lg font-heading transition flex items-center gap-2 ${
              hasChanges && !isPaymentMade
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <HiCheck className="w-5 h-5" />
                Save Kill List
              </>
            )}
          </button>
          <button
            onClick={handlePayAll}
            disabled={paying || isPaymentMade || totalPointsToPay === 0}
            className={`px-6 py-2 rounded-lg font-heading transition flex items-center gap-2 ${
              !isPaymentMade && totalPointsToPay > 0
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <HiCurrencyDollar className="w-5 h-5" />
            Credit All ({totalPointsToPay} pts)
          </button>
        </div>

        {/* Player List - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <div className="space-y-2 pb-4">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading players...</div>
            ) : enrolledUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                {searchQuery ? 'No players found matching your search' : 'No players enrolled'}
              </div>
            ) : (
              enrolledUsers.map((user, index) => {
                const currentKills = killCounts[user.mobile_no] ?? user.existingKills;
                const pointsToCredit = calculatePoints(currentKills, user.mobile_no);
                const isPaid = !!user.pointsCredited;
                const hasCustomCredit = customCredits[user.mobile_no] || tournament.payment_info?.custom_credits?.[user.mobile_no];

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`bg-bg-secondary border rounded-lg p-3 md:p-4 ${
                      isPaid ? 'border-green-600/50' : 'border-gray-800'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                      {/* Left Section: Rank, Avatar, Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Rank Badge */}
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-heading flex-shrink-0 ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-orange-700 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {index + 1}
                        </div>

                        {/* Avatar */}
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center text-bg font-heading text-sm md:text-lg flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-heading truncate text-sm md:text-base">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">FF ID: {user.ff_id}</p>
                          {hasCustomCredit && (
                            <p className="text-xs text-purple-400 mt-1">
                              Custom: {hasCustomCredit} pts
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Section: Controls */}
                      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        {/* Kill Counter */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleKillChange(user.mobile_no, currentKills - 1)}
                            disabled={isPaymentMade}
                            className="w-7 h-7 md:w-8 md:h-8 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition text-sm md:text-base"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={currentKills}
                            onChange={(e) => handleKillChange(user.mobile_no, parseInt(e.target.value) || 0)}
                            disabled={isPaymentMade}
                            className="w-12 md:w-16 h-7 md:h-8 text-center bg-bg border border-gray-600 rounded text-orange-400 font-heading text-sm md:text-base focus:outline-none focus:border-orange-500 disabled:opacity-50"
                            min="0"
                          />
                          <button
                            onClick={() => handleKillChange(user.mobile_no, currentKills + 1)}
                            disabled={isPaymentMade}
                            className="w-7 h-7 md:w-8 md:h-8 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition text-sm md:text-base"
                          >
                            +
                          </button>
                        </div>

                        {/* Points Display */}
                        <div className="text-right min-w-[70px] md:min-w-[100px]">
                          <p className="text-xs md:text-sm text-gray-400">Points</p>
                          <p className={`text-sm md:text-lg font-heading ${isPaid ? 'text-green-400' : 'text-primary'}`}>
                            {pointsToCredit} pts
                          </p>
                          {isPaid && (
                            <p className="text-xs text-green-400">✓ Paid</p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-row md:flex-col gap-2">
                          {!isPaid && (
                            <button
                              onClick={() => handlePayIndividual(user.mobile_no)}
                              disabled={paying || pointsToCredit <= 0}
                              className="px-2 md:px-3 py-1 md:py-1.5 bg-green-600 text-white rounded text-xs md:text-sm font-heading hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                              Credit
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowCustomCreditModal(user.mobile_no);
                              setCustomCreditAmount(customCredits[user.mobile_no]?.toString() || '');
                            }}
                            disabled={isPaymentMade}
                            className="px-2 md:px-3 py-1 md:py-1.5 bg-purple-600 text-white rounded text-xs md:text-sm font-heading hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            title="Set custom point credit (hidden option)"
                          >
                            Custom
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Individual Credit Confirmation Modal */}
      <AnimatePresence>
        {showCreditConfirmModal && (() => {
          const user = enrolledUsers.find((u) => u.mobile_no === showCreditConfirmModal);
          if (!user) return null;
          const kills = killCounts[user.mobile_no] ?? user.existingKills;
          const pointsToCredit = calculatePoints(kills, user.mobile_no);
          
          return (
            <motion.div
              key={showCreditConfirmModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreditConfirmModal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-bg-secondary border border-green-500 rounded-lg p-6 max-w-md w-full"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    <HiCurrencyDollar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading text-green-400">Confirm Credit</h3>
                    <p className="text-sm text-gray-400">Credit points to player</p>
                  </div>
                </div>
                
                <div className="bg-bg rounded-lg p-4 mb-4">
                  <p className="text-gray-400 text-sm mb-1">Player</p>
                  <p className="text-white font-heading">{user.name}</p>
                  <p className="text-xs text-gray-500 mt-1">FF ID: {user.ff_id}</p>
                </div>
                
                <div className="bg-bg rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Kills</span>
                    <span className="text-orange-400 font-heading">{kills}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Points to Credit</span>
                    <span className="text-green-400 font-heading text-lg">{pointsToCredit} pts</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmPayIndividual(showCreditConfirmModal)}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-heading hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <HiCurrencyDollar className="w-5 h-5" />
                    Confirm Credit
                  </button>
                  <button
                    onClick={() => setShowCreditConfirmModal(null)}
                    className="px-6 py-3 bg-bg border border-gray-700 text-white rounded-lg hover:border-gray-500 transition"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Pay All Confirmation Modal */}
      <AnimatePresence>
        {showPayAllConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPayAllConfirmModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-secondary border border-green-500 rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <HiCurrencyDollar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-heading text-green-400">Confirm Credit All</h3>
                  <p className="text-sm text-gray-400">Credit points to all players</p>
                </div>
              </div>
              
              <div className="bg-bg rounded-lg p-4 mb-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Total Players</span>
                  <span className="text-white font-heading">{enrolledUsers.filter(u => !u.pointsCredited).length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Total Points</span>
                  <span className="text-green-400 font-heading text-lg">{totalPointsToPay} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Points Per Kill</span>
                  <span className="text-primary font-heading">{pointsPerKill} pts</span>
                </div>
              </div>
              
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3 mb-4">
                <p className="text-yellow-300 text-sm">
                  This will credit points to all unpaid players. This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={confirmPayAll}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-heading hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <HiCurrencyDollar className="w-5 h-5" />
                  Confirm Credit All
                </button>
                <button
                  onClick={() => setShowPayAllConfirmModal(false)}
                  className="px-6 py-3 bg-bg border border-gray-700 text-white rounded-lg hover:border-gray-500 transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Credit Modal */}
      <AnimatePresence>
        {showCustomCreditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCustomCreditModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-secondary border border-purple-500 rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-heading text-purple-400 mb-4">Custom Point Credit</h3>
              <p className="text-gray-400 text-sm mb-4">
                Credit custom points as tournament winnings (overrides kill-based calculation)
              </p>
              <input
                type="number"
                value={customCreditAmount}
                onChange={(e) => setCustomCreditAmount(e.target.value)}
                placeholder="Enter custom points"
                className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:border-purple-500"
                min="0"
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const amount = parseInt(customCreditAmount) || 0;
                    await handleCustomCredit(showCustomCreditModal, amount);
                  }}
                  disabled={paying || !customCreditAmount || parseInt(customCreditAmount) <= 0}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-heading hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Crediting...
                    </>
                  ) : (
                    <>
                      <HiCurrencyDollar className="w-4 h-4" />
                      Credit Points
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setCustomCredits((prev) => {
                      const newCredits = { ...prev };
                      delete newCredits[showCustomCreditModal];
                      return newCredits;
                    });
                    setShowCustomCreditModal(null);
                    setCustomCreditAmount('');
                    setHasChanges(true);
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    setShowCustomCreditModal(null);
                    setCustomCreditAmount('');
                  }}
                  className="px-4 py-2 bg-bg border border-gray-700 text-white rounded-lg hover:border-gray-500 transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

