import React, { useState, useEffect } from 'react';
import { 
    X, Plus, Sparkles, Check, AlertCircle, ArrowRight, 
    Trash2, ChevronUp, ChevronDown, BookOpen, PenTool,
    Users, Clock, Shield, Search, Loader2
} from 'lucide-react';
import api from '../../lib/api';
import { useNav } from '../../navigation/NavigationContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useLayout } from '../../contexts/LayoutContext';

interface RoomConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser?: any;
}

export const RoomConfigModal: React.FC<RoomConfigModalProps> = ({ isOpen, onClose, currentUser: propUser }) => {
    if (!isOpen) return null;

    const { isLight } = useLayout();
    const { goToHostedRoom } = useNav();
    const authUser = useAuthStore(state => state.user);
    const currentUser = propUser || authUser;

    const DEFAULT_CATALOG_PROBLEMS = [
        {
            _id: 'two-sum',
            id: 'two-sum',
            slug: 'two-sum',
            title: 'Two Sum',
            difficulty: 'EASY',
            category: 'Arrays',
            description: 'Find two indices in an integer array that sum to target.',
            isCustom: false
        },
        {
            _id: 'valid-palindrome',
            id: 'valid-palindrome',
            slug: 'valid-palindrome',
            title: 'Valid Palindrome',
            difficulty: 'EASY',
            category: 'Two Pointers',
            description: 'Determine if a string reads the same forwards and backwards ignoring alphanumeric case.',
            isCustom: false
        },
        {
            _id: 'reverse-list',
            id: 'reverse-list',
            slug: 'reverse-list',
            title: 'Reverse Linked List',
            difficulty: 'EASY',
            category: 'Linked List',
            description: 'Reverse the node pointers of a singly linked list in-place.',
            isCustom: false
        },
        {
            _id: 'invert-tree',
            id: 'invert-tree',
            slug: 'invert-tree',
            title: 'Invert Binary Tree',
            difficulty: 'EASY',
            category: 'Trees',
            description: 'Swap left and right subtrees recursively across all nodes.',
            isCustom: false
        },
        {
            _id: 'max-subarray',
            id: 'max-subarray',
            slug: 'max-subarray',
            title: 'Maximum Subarray',
            difficulty: 'MEDIUM',
            category: 'Dynamic Programming',
            description: 'Locate the contiguous array slice with the highest cumulative sum.',
            isCustom: false
        },
        {
            _id: 'container-water',
            id: 'container-water',
            slug: 'container-water',
            title: 'Container With Most Water',
            difficulty: 'MEDIUM',
            category: 'Two Pointers',
            description: 'Maximize the geometric area enclosed between two vertical coordinate bars.',
            isCustom: false
        }
    ];

    // Configuration states
    const [title, setTitle] = useState(`${currentUser?.username || 'Operator'}'s Sector`);
    const [capacity, setCapacity] = useState(8);
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');

    // Catalog state
    const [catalogProblems, setCatalogProblems] = useState<any[]>(DEFAULT_CATALOG_PROBLEMS);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('ALL');

    // Selected problem set sequence (ordered)
    const [selectedProblems, setSelectedProblems] = useState<any[]>([
        {
            id: 'two-sum',
            problemId: 'two-sum',
            slug: 'two-sum',
            title: 'Two Sum',
            difficulty: 'EASY',
            category: 'Arrays',
            isCustom: false
        }
    ]);

    // Custom problem authoring state (Phase 15E)
    const [customTitle, setCustomTitle] = useState('');
    const [customDifficulty, setCustomDifficulty] = useState('MEDIUM');
    const [customDesc, setCustomDesc] = useState('');
    const [customFuncName, setCustomFuncName] = useState('solve');
    const [customReturnType, setCustomReturnType] = useState('string');
    const [customParamName, setCustomParamName] = useState('input');
    const [customParamType, setCustomParamType] = useState('string');
    const [customTestCases, setCustomTestCases] = useState<any[]>([
        { input: '"racecar"', expectedOutput: '"true"', isHidden: false },
        { input: '"codearena"', expectedOutput: '"false"', isHidden: true }
    ]);
    const [isValidatingCustom, setIsValidatingCustom] = useState(false);
    const [customValidationResult, setCustomValidationResult] = useState<{ success: boolean; message: string } | null>(null);

    // Deploy state
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployError, setDeployError] = useState<string | null>(null);

    // Fetch catalog problems on open
    useEffect(() => {
        if (!isOpen) return;
        setCatalogLoading(true);
        api.get('/problems?limit=50')
            .then(res => {
                const list = res.data?.data || res.data || [];
                const arr = Array.isArray(list) && list.length > 0 ? list : DEFAULT_CATALOG_PROBLEMS;
                setCatalogProblems(arr);
                // Pre-select first problem if none selected yet
                setSelectedProblems(prev => {
                    if (prev.length > 0) return prev;
                    const first = arr[0];
                    return [{
                        id: first._id || first.id || first.slug,
                        problemId: first._id || first.id || first.slug,
                        slug: first.slug,
                        title: first.title,
                        difficulty: (first.difficulty || 'MEDIUM').toUpperCase(),
                        category: first.category || 'Algorithms',
                        isCustom: false
                    }];
                });
            })
            .catch(err => {
                console.warn('[ROOM_CONFIG] Backend catalog query failed, using built-in problem catalog:', err);
                setCatalogProblems(DEFAULT_CATALOG_PROBLEMS);
            })
            .finally(() => setCatalogLoading(false));
    }, [isOpen]);

    if (!isOpen) return null;

    // Filter catalog problems
    const filteredCatalog = catalogProblems.filter(p => {
        const matchesSearch = !searchQuery || p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || p.category?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDiff = difficultyFilter === 'ALL' || p.difficulty?.toUpperCase() === difficultyFilter;
        return matchesSearch && matchesDiff;
    });

    // Add problem to sequence
    const addCatalogProblem = (prob: any) => {
        const probKey = prob._id || prob.id || prob.slug;
        if (selectedProblems.some(sp => sp.id === probKey || sp.problemId === probKey || (sp.slug && sp.slug === prob.slug))) return;
        setSelectedProblems(prev => [
            ...prev,
            {
                id: probKey,
                problemId: probKey,
                slug: prob.slug,
                title: prob.title,
                difficulty: prob.difficulty?.toUpperCase() || 'MEDIUM',
                category: prob.category || 'Algorithms',
                isCustom: false
            }
        ]);
    };

    // Sequence reordering
    const moveProblem = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= selectedProblems.length) return;
        const newArr = [...selectedProblems];
        const temp = newArr[index];
        newArr[index] = newArr[targetIndex];
        newArr[targetIndex] = temp;
        setSelectedProblems(newArr);
    };

    const removeProblem = (index: number) => {
        setSelectedProblems(prev => prev.filter((_, i) => i !== index));
    };

    // Custom problem test case handling
    const addTestCase = () => {
        setCustomTestCases(prev => [...prev, { input: '', expectedOutput: '', isHidden: false }]);
    };

    const updateTestCase = (index: number, field: string, value: any) => {
        setCustomTestCases(prev => prev.map((tc, i) => i === index ? { ...tc, [field]: value } : tc));
    };

    const removeTestCase = (index: number) => {
        if (customTestCases.length <= 2) return;
        setCustomTestCases(prev => prev.filter((_, i) => i !== index));
    };

    // Validate custom problem (Phase 15E server validation)
    const handleValidateCustom = async () => {
        setIsValidatingCustom(true);
        setCustomValidationResult(null);
        try {
            const res = await api.post('/rooms/validate-custom', {
                title: customTitle,
                difficulty: customDifficulty,
                description: customDesc,
                functionName: customFuncName,
                returnType: customReturnType,
                parameters: [{ name: customParamName, type: customParamType }],
                testCases: customTestCases
            });
            if (res.data?.success) {
                setCustomValidationResult({ success: true, message: 'Custom problem validated successfully by server judge engine!' });
            }
        } catch (err: any) {
            setCustomValidationResult({
                success: false,
                message: err.response?.data?.message || err.message || 'Validation failed'
            });
        } finally {
            setIsValidatingCustom(false);
        }
    };

    // Add custom problem to selected problem set
    const handleAddCustomProblem = () => {
        if (!customTitle.trim() || !customDesc.trim()) {
            setCustomValidationResult({ success: false, message: 'Please provide both title and description.' });
            return;
        }

        const customObj = {
            title: customTitle.trim(),
            difficulty: customDifficulty,
            description: customDesc.trim(),
            functionName: customFuncName.trim(),
            returnType: customReturnType.trim(),
            parameters: [{ name: customParamName, type: customParamType }],
            testCases: customTestCases,
            isCustom: true
        };

        setSelectedProblems(prev => [...prev, customObj]);

        // Reset custom fields
        setCustomTitle('');
        setCustomDesc('');
        setCustomValidationResult(null);
        setActiveTab('catalog');
    };

    // Deploy multi-user room
    const handleDeploy = async () => {
        setIsDeploying(true);
        setDeployError(null);

        try {
            let catalogIds = selectedProblems.filter(p => !p.isCustom).map(p => p.id || p.problemId || p.slug).filter(Boolean);
            const customProbs = selectedProblems.filter(p => p.isCustom);

            // If no problems selected, try picking the first catalog problem if available
            if (catalogIds.length === 0 && customProbs.length === 0 && catalogProblems.length > 0) {
                const first = catalogProblems[0];
                const fid = first._id || first.id || first.slug;
                if (fid) catalogIds = [fid];
            }

            if (catalogIds.length === 0 && customProbs.length === 0) {
                setDeployError('Please add at least 1 problem from the catalog or author a custom problem before deploying.');
                setIsDeploying(false);
                return;
            }

            const res = await api.post('/rooms/create', {
                title: title.trim() || `${currentUser?.username || 'Operator'}'s Sector`,
                capacity,
                durationMinutes,
                problemIds: catalogIds,
                customProblems: customProbs
            });

            if (res.data?.success && res.data.room?.roomCode) {
                onClose();
                goToHostedRoom(res.data.room.roomCode);
            } else {
                throw new Error(res.data?.message || 'Server returned incomplete room data');
            }
        } catch (err: any) {
            console.error('[ROOM_DEPLOY_ERROR]', err);
            let msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to deploy room';
            if (msg.includes('Network Error')) {
                msg = 'Network Error: Cannot connect to the CodeArena backend API (port 3001). Please ensure the backend server is running via "npm run dev" in apps/server.';
            }
            setDeployError(msg);
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className={`relative w-full max-w-4xl h-[92vh] max-h-[860px] rounded-[2rem] sm:rounded-[2.5rem] border flex flex-col overflow-hidden shadow-2xl my-auto ${
                isLight
                    ? 'bg-white border-slate-200 text-slate-900'
                    : 'bg-[#0c0d16] border-white/10 text-white shadow-[0_0_80px_rgba(139,92,246,0.15)]'
            }`}>
                {/* Top gradient line */}
                <div className="h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 shrink-0" />

                {/* Header */}
                <div className={`flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b shrink-0 gap-4 ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#0c0d16]'
                }`}>
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                            isLight ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                        }`}>
                            <Sparkles size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 className={`text-lg sm:text-xl font-black uppercase tracking-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                Deploy Hosted Multi-User Arena
                            </h2>
                            <p className={`text-xs truncate font-semibold tracking-wide ${isLight ? 'text-purple-700 font-bold' : 'text-purple-400'}`}>
                                Race Protocol // Fixed Sequence // Unranked 0 RP
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-all shrink-0 ${
                        isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
                    {/* Error Banner */}
                    {deployError && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs font-semibold">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{deployError}</span>
                        </div>
                    )}

                    {/* Basic Parameters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="sm:col-span-1">
                            <label className={`text-[11px] font-bold uppercase tracking-[0.15em] block mb-2 ${isLight ? 'text-purple-700' : 'text-gray-300'}`}>Room Designation</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                maxLength={40}
                                className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold transition-all ${
                                    isLight
                                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-purple-600'
                                        : 'bg-white/5 border-white/10 text-white focus:outline-none focus:border-purple-500'
                                }`}
                            />
                        </div>

                        <div>
                            <label className={`text-[11px] font-bold uppercase tracking-[0.15em] block mb-2 ${isLight ? 'text-purple-700' : 'text-gray-300'}`}>Capacity ({capacity} Operators)</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[2, 4, 6, 8].map(cap => (
                                    <button
                                        key={cap}
                                        type="button"
                                        onClick={() => setCapacity(cap)}
                                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                                            capacity === cap
                                                ? (isLight ? 'bg-purple-600 border-purple-600 text-white shadow-md font-black' : 'bg-purple-600 border-purple-400 text-white shadow-lg')
                                                : (isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 font-bold' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10')
                                        }`}
                                    >
                                        {cap}P
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className={`text-[11px] font-bold uppercase tracking-[0.15em] block mb-2 ${isLight ? 'text-purple-700' : 'text-gray-300'}`}>Duration ({durationMinutes} Min)</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[15, 30, 45, 60].map(dur => (
                                    <button
                                        key={dur}
                                        type="button"
                                        onClick={() => setDurationMinutes(dur)}
                                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                                            durationMinutes === dur
                                                ? (isLight ? 'bg-cyan-600 border-cyan-600 text-white shadow-md font-black' : 'bg-cyan-600 border-cyan-400 text-white shadow-lg')
                                                : (isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 font-bold' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10')
                                        }`}
                                    >
                                        {dur}m
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Selected Sequence Summary */}
                    <div className={`p-6 rounded-3xl border space-y-4 ${
                        isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/10'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-bold uppercase tracking-[0.15em] flex items-center gap-2 ${
                                isLight ? 'text-purple-700 font-black' : 'text-purple-400'
                            }`}>
                                <span>Race Problem Sequence ({selectedProblems.length} Selected)</span>
                            </span>
                            <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Participants solve in exact order #1 &rarr; #{selectedProblems.length}</span>
                        </div>

                        {selectedProblems.length === 0 ? (
                            <div className={`p-8 text-center border border-dashed rounded-2xl ${
                                isLight ? 'border-slate-300 text-slate-600 font-medium' : 'border-white/10 text-gray-500'
                            }`}>
                                <p className="text-xs font-medium">No problems added yet. Pick from the catalog or author custom ones below.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {selectedProblems.map((prob, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                        isLight ? 'bg-white border-slate-200 hover:border-purple-300 shadow-sm' : 'bg-white/5 border-white/5 hover:border-white/10'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                                                isLight ? 'bg-purple-100 text-purple-800' : 'bg-purple-500/20 text-purple-300'
                                            }`}>
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{prob.title}</span>
                                                    {prob.isCustom && (
                                                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                                                            isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                                                        }`}>
                                                            CUSTOM
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                                    prob.difficulty === 'HARD'
                                                        ? (isLight ? 'text-rose-700' : 'text-red-400')
                                                        : prob.difficulty === 'MEDIUM'
                                                        ? (isLight ? 'text-amber-700' : 'text-yellow-400')
                                                        : (isLight ? 'text-emerald-700' : 'text-emerald-400')
                                                }`}>
                                                    {prob.difficulty} // {prob.category}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => moveProblem(idx, 'up')}
                                                disabled={idx === 0}
                                                className={`p-1.5 rounded-lg disabled:opacity-20 transition-colors ${
                                                    isLight ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/10 text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                <ChevronUp size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveProblem(idx, 'down')}
                                                disabled={idx === selectedProblems.length - 1}
                                                className={`p-1.5 rounded-lg disabled:opacity-20 transition-colors ${
                                                    isLight ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/10 text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                <ChevronDown size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeProblem(idx)}
                                                className={`p-1.5 rounded-lg transition-colors ml-1 ${
                                                    isLight ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-600' : 'hover:bg-red-500/20 text-gray-500 hover:text-red-400'
                                                }`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Problem Selection Tabs */}
                    <div className="space-y-6">
                        <div className={`flex gap-4 border-b pb-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('catalog')}
                                className={`flex items-center gap-2 pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                                    activeTab === 'catalog'
                                        ? (isLight ? 'border-purple-600 text-purple-700' : 'border-purple-400 text-purple-400')
                                        : (isLight ? 'border-transparent text-slate-600 hover:text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-300')
                                }`}
                            >
                                <BookOpen size={16} />
                                <span>Problem Catalog</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('custom')}
                                className={`flex items-center gap-2 pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                                    activeTab === 'custom'
                                        ? (isLight ? 'border-amber-600 text-amber-700' : 'border-amber-400 text-amber-400')
                                        : (isLight ? 'border-transparent text-slate-600 hover:text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-300')
                                }`}
                            >
                                <PenTool size={16} />
                                <span>Author Custom Problem (15E)</span>
                            </button>
                        </div>

                        {/* Catalog Tab */}
                        {activeTab === 'catalog' && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search size={16} className={`absolute left-3.5 top-3 ${isLight ? 'text-slate-400' : 'text-gray-500'}`} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search algorithms by name or topic..."
                                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-xs font-medium transition-all ${
                                                isLight
                                                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-purple-600'
                                                    : 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500'
                                            }`}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        {['ALL', 'EASY', 'MEDIUM', 'HARD'].map(diff => (
                                            <button
                                                key={diff}
                                                type="button"
                                                onClick={() => setDifficultyFilter(diff)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                                    difficultyFilter === diff
                                                        ? (isLight ? 'bg-purple-600 border-purple-600 text-white shadow-sm font-black' : 'bg-white/10 border-purple-500 text-purple-300')
                                                        : (isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:text-purple-700 font-bold' : 'bg-white/2 border-white/5 text-gray-500 hover:text-gray-300')
                                                }`}
                                            >
                                                {diff}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {catalogLoading ? (
                                        <div className={`py-8 text-center font-medium text-xs flex items-center justify-center gap-2 ${isLight ? 'text-slate-600' : 'text-gray-500'}`}>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Loading catalog...</span>
                                        </div>
                                    ) : filteredCatalog.length === 0 ? (
                                        <div className={`py-8 text-center font-medium text-xs ${isLight ? 'text-slate-600' : 'text-gray-500'}`}>No matching problems found.</div>
                                    ) : (
                                        filteredCatalog.map(prob => {
                                            const isSelected = selectedProblems.some(sp => sp.id === prob._id || sp.slug === prob.slug);
                                            return (
                                                <div key={prob._id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                    isLight ? 'bg-slate-50 border-slate-200 hover:border-purple-300 hover:bg-slate-100 shadow-sm' : 'bg-white/5 border-white/5 hover:bg-white/10'
                                                }`}>
                                                    <div>
                                                        <span className={`text-xs font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>{prob.title}</span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                                            prob.difficulty === 'HARD'
                                                                ? (isLight ? 'text-rose-700' : 'text-red-400')
                                                                : prob.difficulty === 'MEDIUM'
                                                                ? (isLight ? 'text-amber-700' : 'text-yellow-400')
                                                                : (isLight ? 'text-emerald-700' : 'text-emerald-400')
                                                        }`}>
                                                            {prob.difficulty} // {prob.category}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => addCatalogProblem(prob)}
                                                        disabled={isSelected}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                            isSelected
                                                                ? (isLight ? 'bg-slate-200 text-slate-500' : 'bg-white/10 text-gray-500 opacity-60')
                                                                : (isLight ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm' : 'bg-purple-600 hover:bg-purple-500 text-white')
                                                        }`}
                                                    >
                                                        {isSelected ? 'Added' : '+ Add'}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Custom Authoring Tab (15E) */}
                        {activeTab === 'custom' && (
                            <div className={`p-6 rounded-3xl border space-y-6 ${
                                isLight ? 'bg-slate-50 border-amber-300 shadow-sm' : 'bg-white/[0.02] border-amber-500/20'
                            }`}>
                                {customValidationResult && (
                                    <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold border ${customValidationResult.success ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                        {customValidationResult.success ? <Check size={18} /> : <AlertCircle size={18} />}
                                        <span>{customValidationResult.message}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-slate-800' : 'text-gray-300'}`}>Problem Title</label>
                                        <input
                                            type="text"
                                            value={customTitle}
                                            onChange={e => setCustomTitle(e.target.value)}
                                            placeholder="e.g. Reverse Byte Sequence"
                                            className={`w-full px-3.5 py-2 border rounded-xl text-xs font-bold ${
                                                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500' : 'bg-white/5 border-white/10 text-white focus:outline-none focus:border-amber-400'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-slate-800' : 'text-gray-300'}`}>Difficulty</label>
                                        <div className="flex gap-2">
                                            {['EASY', 'MEDIUM', 'HARD'].map(d => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => setCustomDifficulty(d)}
                                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                        customDifficulty === d
                                                            ? 'bg-amber-500 text-black border-amber-400 font-black shadow-sm'
                                                            : (isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 font-bold' : 'bg-white/5 border-white/10 text-gray-400')
                                                    }`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-slate-800' : 'text-gray-300'}`}>Description & Constraints</label>
                                    <textarea
                                        value={customDesc}
                                        onChange={e => setCustomDesc(e.target.value)}
                                        rows={3}
                                        placeholder="Describe the task, inputs, and output expectations..."
                                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-medium ${
                                            isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500' : 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-400'
                                        }`}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-slate-800' : 'text-gray-300'}`}>Function Name</label>
                                        <input
                                            type="text"
                                            value={customFuncName}
                                            onChange={e => setCustomFuncName(e.target.value)}
                                            placeholder="solve"
                                            className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium ${
                                                isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500' : 'bg-white/5 border-white/10 text-white focus:outline-none focus:border-amber-400'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-slate-800' : 'text-gray-300'}`}>Parameter (Name: Type)</label>
                                        <div className="flex gap-1.5">
                                            <input
                                                type="text"
                                                value={customParamName}
                                                onChange={e => setCustomParamName(e.target.value)}
                                                className={`w-1/2 px-2.5 py-2 border rounded-xl text-xs font-medium ${
                                                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/5 border-white/10 text-white'
                                                }`}
                                            />
                                            <input
                                                type="text"
                                                value={customParamType}
                                                onChange={e => setCustomParamType(e.target.value)}
                                                className={`w-1/2 px-2.5 py-2 border rounded-xl text-xs font-medium ${
                                                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/5 border-white/10 text-white'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-slate-800' : 'text-gray-300'}`}>Return Type</label>
                                        <input
                                            type="text"
                                            value={customReturnType}
                                            onChange={e => setCustomReturnType(e.target.value)}
                                            className={`w-full px-3.5 py-2 border rounded-xl text-xs font-medium ${
                                                isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500' : 'bg-white/5 border-white/10 text-white focus:outline-none focus:border-amber-400'
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* Test Cases Editor */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-gray-300'}`}>Test Cases (Minimum 2)</label>
                                        <button
                                            type="button"
                                            onClick={addTestCase}
                                            className={`text-xs hover:underline flex items-center gap-1 font-bold ${
                                                isLight ? 'text-amber-700' : 'text-amber-400'
                                            }`}
                                        >
                                            <Plus size={14} /> Add Test Case
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {customTestCases.map((tc, idx) => (
                                            <div key={idx} className={`p-3 rounded-xl border flex flex-col sm:flex-row gap-3 items-center ${
                                                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
                                            }`}>
                                                <span className={`text-xs font-bold shrink-0 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>#{idx + 1}</span>
                                                <input
                                                    type="text"
                                                    value={tc.input}
                                                    onChange={e => updateTestCase(idx, 'input', e.target.value)}
                                                    placeholder="Input (e.g. 5, [1,2,3])"
                                                    className={`w-full sm:w-1/2 px-3 py-1.5 border rounded-lg text-xs font-medium ${
                                                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/50 border-white/10 text-white'
                                                    }`}
                                                />
                                                <input
                                                    type="text"
                                                    value={tc.expectedOutput}
                                                    onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)}
                                                    placeholder="Expected Output (e.g. 10)"
                                                    className={`w-full sm:w-1/2 px-3 py-1.5 border rounded-lg text-xs font-medium ${
                                                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/50 border-white/10 text-white'
                                                    }`}
                                                />
                                                <label className={`flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${isLight ? 'text-slate-700 font-medium' : 'text-gray-400'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={tc.isHidden}
                                                        onChange={e => updateTestCase(idx, 'isHidden', e.target.checked)}
                                                        className="rounded"
                                                    />
                                                    <span>Hidden</span>
                                                </label>
                                                {customTestCases.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTestCase(idx)}
                                                        className={`p-1 shrink-0 ${isLight ? 'text-slate-400 hover:text-rose-600' : 'text-gray-500 hover:text-red-400'}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleValidateCustom}
                                        disabled={isValidatingCustom}
                                        className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                                            isLight
                                                ? 'border-amber-400 bg-amber-100 hover:bg-amber-200 text-amber-900'
                                                : 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300'
                                        }`}
                                    >
                                        {isValidatingCustom ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        <span>Validate with Server Engine</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddCustomProblem}
                                        className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                                    >
                                        + Add to Problem Sequence
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-between px-6 sm:px-8 py-4 sm:py-5 border-t shrink-0 gap-4 ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#0c0d16]'
                }`}>
                    <div className={`text-xs font-semibold ${isLight ? 'text-slate-700 font-bold' : 'text-gray-400'}`}>
                        {selectedProblems.length} Problem{selectedProblems.length !== 1 ? 's' : ''} in Race &bull; Max {capacity} Operators
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-5 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                                isLight ? 'border-slate-300 hover:bg-slate-200 text-slate-700' : 'border-white/10 hover:bg-white/5 text-gray-400'
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDeploy}
                            disabled={isDeploying}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all"
                        >
                            {isDeploying ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Deploying...</span>
                                </>
                            ) : (
                                <>
                                    <span>Deploy Room</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
