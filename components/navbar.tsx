import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@heroui/navbar";
import { Button } from "@heroui/button";
import { Kbd } from "@heroui/kbd";
import { Link } from "@heroui/link";
import { Input } from "@heroui/input";
import { link as linkStyles } from "@heroui/theme";
import ModalAddScore from "@/app/home/modalAddScore";
import Script from "next/script";

import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import {
  TwitterIcon,
  GithubIcon,
  DiscordIcon,
  HeartFilledIcon,
  SearchIcon,
  Logo,
} from "@/components/icons";

import { CamertonLogo } from "./camertonSvg";

export const Navbar = () => {
  return (
    <>
      <HeroUINavbar
        maxWidth="xl"
        position="sticky"
        className="bg-navbar"
        style={{ borderBottom: "1px solid #7D5E42" }}
      >
        <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
          <Link href={"/"} style={{ display: "inline" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <CamertonLogo className="h-12 w-12 -translate-y-1" />
              <p className="font-navbarBrand text-inherit">Нотная библиотека</p>
            </div>
          </Link>

          {/* <ul className="hidden lg:flex gap-4 justify-start ml-2">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href}>
              <NextLink
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium"
                )}
                color="foreground"
                href={item.href}
              >
                {item.label}
              </NextLink>
            </NavbarItem>
          ))}
        </ul> */}
        </NavbarContent>

        <NavbarContent
          className="hidden sm:flex basis-1/5 sm:basis-full"
          justify="end"
        >
          <NavbarItem className="hidden md:flex gap-4">
            {/* <Button
            as={Link}
            className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full px-6 py-2 text-2xl font-normal shadow-md w-auto min-w-0"
            onClick={}
            // href={siteConfig.links.sponsor}
            // startContent={<HeartFilledIcon className="text-danger" />}
          >
            +
          </Button> */}
            <ModalAddScore />
            <Button
              as={Link}
              radius="full"
              isIconOnly
              className="bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full  shadow-md"
              // href={siteConfig.links.sponsor}
              // startContent={<HeartFilledIcon className="text-danger" />}
            >
              S
            </Button>
          </NavbarItem>
        </NavbarContent>
      </HeroUINavbar>
      {/* <div className="h-[1px] w-full bg-gradient-to-r from-[#BD9673] to-[#7D5E42]"></div> */}
    </>
  );
};
