import { SvgIconComponent } from "@mui/icons-material";

interface Props {
  Icon: SvgIconComponent;
  onClick?: () => void;
  backgroundColor: string;
}

const IconButton = ({ Icon, onClick, backgroundColor }: Props) => {

  return (
    <div
      className="h-12 w-12 text-white rounded-full flex justify-center items-center cursor-pointer shadow-md"
      onClick={onClick}
      style={{ backgroundColor }}
    >
      <Icon />
    </div>
  );
}

export default IconButton;
