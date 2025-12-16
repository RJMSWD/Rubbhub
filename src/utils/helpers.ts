export const getDomainStyle = (domain: string) => {
  switch (domain) {
    case '工学':
      return 'bg-cyan-300 text-black border-2 border-black';
    case '理学':
      return 'bg-fuchsia-300 text-black border-2 border-black';
    case '医学':
      return 'bg-lime-300 text-black border-2 border-black';
    case '农学':
      return 'bg-green-300 text-black border-2 border-black';
    case '文学':
    case '历史学':
    case '哲学':
      return 'bg-orange-300 text-black border-2 border-black';
    case '法学':
    case '经济学':
    case '管理学':
    case '教育学':
      return 'bg-yellow-300 text-black border-2 border-black';
    case '艺术学':
      return 'bg-pink-300 text-black border-2 border-black';
    default:
      return 'bg-gray-200 text-black border-2 border-black';
  }
};
