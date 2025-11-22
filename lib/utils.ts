/* eslint-disable prefer-const */
/* eslint-disable no-prototype-builtins */
import { type ClassValue, clsx } from "clsx";
import qs from "qs";
import { twMerge } from "tailwind-merge";

import { aspectRatioOptions } from "@/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ERROR HANDLER
export const handleError = (error:unknown) => {
  if (error instanceof Error) {
    // This is a native JavaScript error (e.g., TypeError, RangeError)
    console.error(error.message);
    //throw new Error(`Error: ${error.message}`);
  } else if (typeof error === "string") {
    // This is a string error message
    console.error(error);
    throw new Error(`Error: ${error}`);
  } else {
    // This is an unknown type of error
    console.error(error);
    throw new Error(`Unknown error: ${JSON.stringify(error)}`);
  }
};

// PLACEHOLDER LOADER - while image is transforming
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#7986AC" offset="20%" />
      <stop stop-color="#68769e" offset="50%" />
      <stop stop-color="#7986AC" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#7986AC" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : window.btoa(str);

export const dataUrl = `data:image/svg+xml;base64,${toBase64(
  shimmer(1000, 1000)
)}`;
// ==== End

// FORM URL QUERY
export const formUrlQuery = ({
  searchParams,
  key,
  value,
}: FormUrlQueryParams) => {
  const params = { ...qs.parse(searchParams.toString()), [key]: value };

  return `${window.location.pathname}?${qs.stringify(params, {
    skipNulls: true,
  })}`;
};

// REMOVE KEY FROM QUERY
export function removeKeysFromQuery({
  searchParams,
  keysToRemove,
}: RemoveUrlQueryParams) {
  const currentUrl = qs.parse(searchParams);

  keysToRemove.forEach((key) => {
    delete currentUrl[key];
  });

  // Remove null or undefined values
  Object.keys(currentUrl).forEach(
    (key) => currentUrl[key] == null && delete currentUrl[key]
  );

  return `${window.location.pathname}?${qs.stringify(currentUrl)}`;
}

// DEBOUNCE
export const debounce = <F extends (...args: Parameters<F>) => ReturnType<F>>(
  func: F,
  delay: number
) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<F>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// GE IMAGE SIZE
export type AspectRatioKey = keyof typeof aspectRatioOptions;

type ImageWithAspectRatio = {
  aspectRatio?: AspectRatioKey;
  width?: number;
  height?: number;
};

export const getImageSize = (
  type: string,
  image: ImageWithAspectRatio,
  dimension: "width" | "height"
): number => {
  if (type === "fill" && image.aspectRatio) {
    const aspectRatio = aspectRatioOptions[image.aspectRatio];
    return aspectRatio?.[dimension] || 1000;
  }
  return image?.[dimension] || 1000;
};

// DOWNLOAD IMAGE
export const download = (url: string, filename: string) => {
  if (!url) {
    throw new Error("Resource URL not provided! You need to provide one");
  }

  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const blobURL = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobURL;

      if (filename && filename.length)
        a.download = `${filename.replace(" ", "_")}.png`;
      document.body.appendChild(a);
      a.click();
    })
    .catch((error) => console.log({ error }));
};

// DEEP MERGE OBJECTS
type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export const deepMergeObjects = <T extends object>(
  obj1: T,
  obj2: DeepPartial<T> | null | undefined
): T => {
  if (obj2 === null || obj2 === undefined) {
    return obj1;
  }

  const output = { ...obj1 } as any;

  for (const key in obj2) {
    if (Object.prototype.hasOwnProperty.call(obj2, key)) {
      const value = obj2[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        output[key] = deepMergeObjects(
          output[key] || {},
          value
        );
      } else {
        output[key] = value;
      }
    }
  }

  return output as T;
};