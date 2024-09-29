const Utils = {
    CleanChannel: (channel: string) => {
      return channel.replace("#", "");
    },
    FormChannel: (channel: string) => {
      return "#" + channel;
    },
  };

export default Utils;