import { useLanguage } from "../context/LanguageContext";

export default function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className="relative w-20 h-9 bg-[#A00040] rounded-full p-1 transition-colors duration-300 focus:outline-none border-2 border-[#D8A7BB]"
    >
      <div className="flex justify-between items-center h-full px-2">
        <span className={`text-[10px] font-bold z-10 ${lang === 'en' ? 'text-slate-900' : 'text-white/60'}`}>EN</span>
        <span className={`text-[10px] font-bold z-10 ${lang === 'fr' ? 'text-slate-900' : 'text-white/60'}`}>FR</span>
      </div>
      <div 
        className={`absolute top-1 bottom-1 w-[34px] bg-white rounded-full shadow-sm transition-all duration-300 ${
          lang === 'fr' ? 'left-[41px]' : 'left-1'
        }`}
      />
    </button>
  );
}
